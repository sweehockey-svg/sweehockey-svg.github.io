(() => {
  "use strict";

  const cfg = window.EHOCKEY_CONFIG || {};
  const supabaseUrl = String(cfg.supabaseUrl || "").trim();
  const supabaseKey = String(cfg.supabasePublishableKey || "").trim();

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const clean = (value) => String(value ?? "").trim();
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  const SUPPORTED_LANGUAGES = ["sv","en","fi","de"];
  const LANGUAGE_FLAGS = { sv:"🇸🇪", en:"🇬🇧", fi:"🇫🇮", de:"🇩🇪" };
  const I18N = {
    sv: {
      nav_build:"BYGG", nav_compete:"TÄVLA", nav_climb:"KLÄTTRA", league:"LIGA", language:"SPRÅK",
      choose_fantasy_league:"Välj Fantasy-liga", choose_language:"Välj språk", powered_by:"DRIVS AV",
      login_discord:"Logga in med Discord", see_rules:"Se regler", players_upper:"SPELARE", budget_upper:"BUDGET",
      max_per_team_upper:"MAX / LAG", captain_upper:"KAPTEN", start_upper:"START", status_upper:"STATUS",
      fantasy_teams_upper:"FANTASY-LAG", beta_source_upper:"BETAKÄLLA", selection_upper:"URVAL", mode_upper:"LÄGE", player_pool_upper:"SPELARPOOL",
      price_range_upper:"PRISINTERVALL", access_upper:"ÅTKOMST", access_value:"DISCORD + KOPPLAD PROFIL",
      matches_upper:"MATCHER", registered:"registrerade", created:"skapade", ownership_info_upper:"ÄGARINFO",
      locked_period:"låst period", deadline_upper:"DEADLINE", swedish_time:"svensk tid", my_team:"Mitt lag",
      players:"Spelare", leaderboard:"Topplista", rules:"Regler", account_required_upper:"KONTO KRÄVS",
      checking_account:"Kontrollerar ditt konto…", account_required_text:"Du måste vara inloggad med Discord och ha en godkänd spelarprofil kopplad för att skapa ett lag.",
      connect_profile:"Koppla spelarprofil", team_manager_upper:"LAGANSVARIG", account_upper:"KONTO", logout:"Logga ut",
      fantasy_team_upper:"FANTASY-LAG", team_name_follows_profile:"Namnet följer din kopplade spelarprofil",
      squad_upper:"TRUPP", used_upper:"ANVÄNT", remaining_upper:"KVAR", transfers_upper:"BYTEN", free_upper:"GRATIS",
      next_upper:"NÄSTA", starting_six_upper:"STARTSEXA", your_starting_six:"Din startsexa", team_history_upper:"LAGHISTORIK",
      former_players:"Tidigare spelare", former_players_note:"Poängen de tjänade in medan de fanns i laget ligger kvar i lagets total.",
      player_market_upper:"SPELARMARKNAD", player_list:"Spelarlista", search_player_team_upper:"SÖK SPELARE / LAG",
      search_placeholder:"Gamertag eller lag…", position_upper:"POSITION", all:"Alla", team_status_upper:"LAGSTATUS",
      save_team:"Spara lag", fantasy_players:"Fantasy-spelare", leaderboard_upper:"TOPPLISTA", rules_upper:"REGLER",
      six_players:"Sex spelare", six_players_text:"LW, C, RW, LD, RD och G. Samma spelare kan bara väljas en gång. Spelare med dokumenterad positionshistorik kan vara valbara på flera platser.",
      fantasy_points:"Fantasy-poäng", position_per_match_text:"<strong>Position per match:</strong> På utespelarplatser räknas bara matcher som spelaren faktiskt spelar som forward eller back, och poängformeln följer den verkliga positionen i varje match. På G-platsen räknas bara matcher som spelaren faktiskt spelar målvakt. Tydliga målvakter och utespelare separeras med historik före tävlingen; verkliga hybrider kan vara valbara i båda rollerna.",
      event:"Händelse", played_match:"Spelad match", goal:"Mål", assist:"Assist", game_winning_goal:"Avgörande mål",
      block:"Block", win:"Vinst", save:"Räddning", shutout:"Hållen nolla", goal_allowed:"Insläppt mål",
      ecl_divisions_text:"<strong>ECL-divisioner:</strong> Matchens SportsGamer liga-ID avgör poängfaktorn. Ett vanligt lagbyte inom samma division påverkar inte Fantasy alls. Om en spelare byter division får bara de nya matcherna den nya divisionens faktor.",
      gcl_divisions_text:"<strong>GCL-divisioner:</strong> Div 1 ger en liten bonus eftersom motståndet är starkare. Div 2 ligger på normal faktor.",
      division:"Division", factor:"Faktor", example_40_raw:"Exempel: 40 råpoäng", verified_account:"Verifierat konto",
      verified_account_text:"Alla kan se sidan och spelarpoolen. För att skapa ett lag krävs Discord-inloggning och godkänd Fantasy-access, normalt genom en kopplad Svensk eHockey-spelarprofil.",
      periods_and_transfers:"Fantasy-perioder och byten", close:"Stäng", choose_player:"Välj spelare", eligible_players_for_position:"Valbara spelare för positionen.",
      choose_position_upper:"VÄLJ POSITION", place_player:"Placera spelaren", place_player_text:"Spelaren kan användas på flera positioner. Välj var spelaren ska placeras i ditt Fantasy-lag.",
      powered_by_full:"Drivs av Svensk eHockey →", preseason:"FÖRSÄSONG", periods_not_ready:"Fantasy-perioderna är inte klara",
      period_info_when_configured:"Periodinformationen visas när tävlingen har konfigurerats.", after_deadline:"Efter deadline", not_set:"Ej satt",
      test_season_current_period:"TESTSÄSONG / AKTUELL PERIOD", live_now:"PÅGÅR NU", latest_period:"SENASTE FANTASY-PERIOD", next_period:"NÄSTA FANTASY-PERIOD",
      published:"Publicerad", preseason_unlimited:"INFÖR SÄSONGEN · OBEGRÄNSADE BYTEN", free_transfer_period:"FRI BYTESPERIOD", upcoming_period:"KOMMANDE PERIOD",
      transfer_window_closed:"BYTESFÖNSTRET STÄNGT", transfers_disabled:"BYTEN AVSTÄNGDA",
      preseason_transfer_detail:"Bygg om fritt fram till första Fantasy-periodens deadline kl. 18:00 svensk tid. Därefter: 1 gratis byte per period, max 2 sparade.",
      period_transfer_detail:"1 gratis byte per period · max 2 sparade · extra byte kostar −{cost} P. Kaptensbyte är gratis.",
      no_more_transfer_periods:"Inga fler Fantasy-perioder är öppna för byten.", transfer_rules_inactive:"Bytesreglerna är inte aktiva just nu.",
      setup:"UPPSTART", open:"ÖPPEN", locked:"LÅST", live:"PÅGÅR", finished:"AVSLUTAD", archived:"ARKIVERAD",
      build_your_six:"Bygg din {league}-sexa", build_six_short:"{league}-SEXA.", setup_intro:"{season} Fantasy är under uppbyggnad.",
      beta_intro:"Välj sex spelare, håll dig under budget och utse din kapten. Spelarpoolen bygger just nu på {source}.",
      normal_intro:"Välj sex spelare, håll dig under budget och utse din kapten. Fantasy följer spelarnas riktiga matcher och resultat.",
      fantasy_preparing:"Fantasy-ligan förbereds.", player_selection:"Spelarurval: {scope}.", pool_not_published_upper:"SPELARPOOL EJ PUBLICERAD",
      under_construction_upper:"UNDER UPPBYGGNAD", team_building_open_upper:"LAGBYGGE ÖPPET", players_count:"{count} SPELARE",
      season_under_construction:"{season} är under uppbyggnad", pool_available:"Fantasy-poolen är tillgänglig.", pool_not_published:"Spelarpoolen är inte publicerad ännu.",
      waiting_for_pool_upper:"VÄNTAR PÅ SPELARPOOL", fantasy_players_kicker:"{season} / FANTASYSPELARE", pool_published_later:"Spelarpoolen publiceras senare.",
      eligible_players_intro:"Här ser du de spelare som är valbara i {season} Fantasy.", leaderboard_opens:"Topplistan öppnar när {season} Fantasy är igång.",
      leaderboard_updates:"Topplistan uppdateras med riktiga Fantasy-poäng efter matcherna.", how_it_works:"Så fungerar {league} Fantasy",
      rules_setup_intro:"{season} Fantasy är förberedd och reglerna kan finjusteras inför öppning.", rules_live_intro:"Bygg din {league}-sexa, håll budgeten och följ poängen period för period.",
      budget_rule:"Hela startsexan måste rymmas inom {budget} CR.", max_team_rule_title:"Max {max} från samma lag",
      max_team_rule:"Du får välja högst {max} spelare från samma riktiga lag.", captain_rule_title:"Kapten {multiplier}×",
      captain_rule:"En spelare utses till kapten och får {percent} procent extra Fantasy-poäng.",
      setup_period_rules:"{season} kommer att använda Fantasy-perioder. Deadlines, fria byten och eventuellt slutspelsreset publiceras innan ligan öppnar.",
      scl_period_rules:"SCL spelas inte i fasta omgångar, så Fantasy delas i tidsbestämda perioder. Varje ny Fantasy-period låses kl. 18:00 svensk tid och matcherna räknas efter sin faktiska starttid. Före första perioden är byten obegränsade. Därefter får du 1 gratis byte per period och kan spara upp till 2. Inför slutspelet återställs de fria bytena. Extra byten kostar −10 Fantasy-poäng och kaptensbyte är gratis.",
      generic_period_rules:"Fantasy delas i tidsbestämda perioder. Matcherna räknas efter sin faktiska starttid och byten gäller från nästa låsta period.",
      login_to_build:"Logga in för att bygga ditt lag", checking_discord:"Kontrollerar Discord-inloggning och kopplad spelarprofil.",
      link_pending:"Spelarkopplingen väntar på godkännande", link_pending_text:"Din valda spelarprofil måste godkännas innan du kan skapa ett Fantasy-lag.",
      link_profile_first:"Koppla din spelarprofil först", link_profile_text:"Discord-kontot är inloggat men saknar en godkänd koppling till ett spelarkort.",
      discord_only:"Fantasy använder Discord-inloggning", discord_only_text:"Logga ut från admin-/skribentkontot och logga sedan in med Discord.",
      linked_player:"Kopplad spelare", team_building_not_open:"Lagbygget är inte öppet ännu.", owner_after_deadline:"Ägarinfo efter deadline",
      owned_by:"Ägs av {owned} % · Kapten {captain} %", unknown:"Okänd", team_not_ready:"Lag ej klart",
      form_info:"Form & info →", show_form_stats:"Visa form & statistik →", no_player_info:"Spelarinformationen kunde inte hämtas.",
      no_matches:"Inga matcher registrerade ännu.", fantasy_points_label:"Fantasy-poäng", matches:"Matcher", points_per_match:"Poäng / match",
      owned:"Ägd", captain:"Kapten", form:"FORM", last_5_matches:"Senaste 5 matcher", outcome:"UTFALL", registered_stats:"Registrerad statistik",
      goals:"Mål", assists:"Assist", blocks:"Block", goalie_wins:"MV-vinster", saves:"Räddningar", shutouts:"Nollor",
      leaderboard_empty:"Topplistan är tom. Den fylls när Fantasy-lag börjar skapas.", show_team:"Visa lag →",
      saved_points:"SPARADE {league}-POÄNG", league_points:"{league}-POÄNG", replace_invalid:"BYT OGILTIG SPELARE", replace_unavailable:"BYT BORTTAGEN SPELARE",
      choose_six:"VÄLJ 6 SPELARE", choose_captain:"VÄLJ KAPTEN", over_budget:"ÖVER BUDGET", team_saved:"{league}-LAG SPARAT",
      update_team:"UPPDATERA {league}-LAG", save_league_team:"SPARA {league}-LAG", choose_slot:"Välj {slot}", eligible_count:"{count} valbara",
      awaiting_real_matches:"Inväntar riktiga matcher", club_upper:"KLUBB", invalid_slot:"Ej giltig som {slot} · välj Byt", unavailable_player:"Inte längre i aktuell SCL-trupp · byt gratis före deadline",
      make_captain:"Gör kapten", swap:"Byt", captain_upper_action:"KAPTEN", no_match_points:"Ingen matchpoäng registrerad",
      points_remain:"Poängen ligger kvar i totalen", choose_position:"Välj position", add:"Lägg till", no_pool:"Spelarpoolen är inte publicerad ännu.",
      ownership_period_default:"senast låsta Fantasy-period", locked_fantasy_teams:"{entries} låsta Fantasy-lag",
      ownership_after_note:"Ägar- och kaptenandel visas först efter Fantasy-periodens deadline.", loading_form:"hämtar form och statistik…",
      could_not_load_player:"Kunde inte hämta spelaren", unnamed_team:"Namnlöst lag", goalie_games_count:"målvaktsmatcher räknas",
      skater_games_count:"utespelarmatcher räknas", hidden_team:"Laget är dolt", locked_team_default:"Låst lag",
      locked_lineup_note:"Det här är den senast låsta uppställningen. Kommande byten visas inte före nästa deadline.",
      no_locked_lineup:"Ingen låst uppställning hittades.", points_remain_total:"Poängen ligger kvar i lagets total",
      loading_locked_team:"Hämtar låst lag…", could_not_load_team:"Kunde inte hämta laget", selected:"Vald",
      no_players_match:"Inga spelare matchar filtret.", player_profile_upper:"SPELARPROFIL / FANTASY", match_singular:"Match",
      league_lower:"liga", ownership_from:"Ägarandel från {period} · {entries} låsta Fantasy-lag.",
      open_discord:"Öppnar Discord…", must_login_save:"Du måste vara inloggad och ha en godkänd spelarprofil kopplad.",
      choose_all_six:"Välj alla sex positioner innan du sparar.", team_over_budget:"Laget är över budget.",
      choose_exact_captain:"Välj exakt en kapten.", saving_team:"Sparar laget…", team_updated:"{league}-laget är uppdaterat.",
      team_saved_success:"{league}-laget är sparat.", captain_position_free:"Kaptensbyte/positionsändring kostar inget.",
      choose_league_option:"Välj Fantasy-liga…", neutral_hero_kicker:"eHOCKEY FANTASY", neutral_hero_first:"eHOCKEY",
      neutral_hero_second:"FANTASY LIGA.", neutral_hero_lead:"Välj en Fantasy-liga i menyn ovan för att öppna tävlingen.",
      neutral_choose_league:"VÄLJ FANTASY-LIGA",
      swap_player:"Byt {name}", picker_count:"{count} spelare tillgängliga för {slot}", pick_slot_upper:"VÄLJ {slot}",
      team_limit_reached:"{limit}/{limit} FRÅN LAGET", no_eligible_for_slot:"Inga valbara spelare för {slot}.",
      player_can_use_on:"{name} kan användas på {slots}.", choose_open_slot:"Välj vilken ledig plats spelaren ska ta.",
      goalie_games_only:"endast målvaktsmatcher räknas", skater_games_only:"endast utespelarmatcher räknas"
    },
    en: {
      nav_build:"BUILD", nav_compete:"COMPETE", nav_climb:"CLIMB", league:"LEAGUE", language:"LANGUAGE",
      choose_fantasy_league:"Choose Fantasy league", choose_language:"Choose language", powered_by:"POWERED BY",
      login_discord:"Log in with Discord", see_rules:"View rules", players_upper:"PLAYERS", budget_upper:"BUDGET",
      max_per_team_upper:"MAX / TEAM", captain_upper:"CAPTAIN", start_upper:"START", status_upper:"STATUS",
      fantasy_teams_upper:"FANTASY TEAMS", beta_source_upper:"BETA SOURCE", selection_upper:"SELECTION", mode_upper:"MODE", player_pool_upper:"PLAYER POOL",
      price_range_upper:"PRICE RANGE", access_upper:"ACCESS", access_value:"DISCORD + LINKED PROFILE", matches_upper:"MATCHES",
      registered:"registered", created:"created", ownership_info_upper:"OWNERSHIP", locked_period:"locked period", deadline_upper:"DEADLINE",
      swedish_time:"Swedish time", my_team:"My team", players:"Players", leaderboard:"Leaderboard", rules:"Rules",
      account_required_upper:"ACCOUNT REQUIRED", checking_account:"Checking your account…",
      account_required_text:"You must be logged in with Discord and have an approved linked player profile to create a team.",
      connect_profile:"Link player profile", team_manager_upper:"TEAM MANAGER", account_upper:"ACCOUNT", logout:"Log out",
      fantasy_team_upper:"FANTASY TEAM", team_name_follows_profile:"The name follows your linked player profile", squad_upper:"SQUAD",
      used_upper:"USED", remaining_upper:"LEFT", transfers_upper:"TRANSFERS", free_upper:"FREE", next_upper:"NEXT",
      starting_six_upper:"STARTING SIX", your_starting_six:"Your starting six", team_history_upper:"TEAM HISTORY",
      former_players:"Former players", former_players_note:"Points earned while they were on your team remain in the team total.",
      player_market_upper:"PLAYER MARKET", player_list:"Player list", search_player_team_upper:"SEARCH PLAYER / TEAM", search_placeholder:"Gamertag or team…",
      position_upper:"POSITION", all:"All", team_status_upper:"TEAM STATUS", save_team:"Save team", fantasy_players:"Fantasy players",
      leaderboard_upper:"LEADERBOARD", rules_upper:"RULES", six_players:"Six players",
      six_players_text:"LW, C, RW, LD, RD and G. The same player can only be selected once. Players with documented position history may be eligible in multiple slots.",
      fantasy_points:"Fantasy points", position_per_match_text:"<strong>Position per match:</strong> In skater slots, only games actually played as a forward or defenseman count, and the scoring formula follows the real position in each game. In the G slot, only games actually played as goalie count. Clear goalies and skaters are separated using pre-tournament history; true hybrids can be eligible in both roles.",
      event:"Event", played_match:"Game played", goal:"Goal", assist:"Assist", game_winning_goal:"Game-winning goal", block:"Block", win:"Win", save:"Save",
      shutout:"Shutout", goal_allowed:"Goal allowed",
      ecl_divisions_text:"<strong>ECL divisions:</strong> The SportsGamer league ID of each game determines the points multiplier. A team change within the same division does not affect Fantasy. If a player changes division, only new games use the new division multiplier.",
      gcl_divisions_text:"<strong>GCL divisions:</strong> Div 1 gets a small bonus because the opposition is stronger. Div 2 uses the normal multiplier.",
      division:"Division", factor:"Multiplier", example_40_raw:"Example: 40 raw points", verified_account:"Verified account",
      verified_account_text:"Anyone can view the page and player pool. Creating a team requires Discord login and approved Fantasy access, normally through a linked Svensk eHockey player profile.",
      periods_and_transfers:"Fantasy periods and transfers", close:"Close", choose_player:"Choose player", eligible_players_for_position:"Eligible players for this position.",
      choose_position_upper:"CHOOSE POSITION", place_player:"Place player", place_player_text:"This player can be used in multiple positions. Choose where to place the player in your Fantasy team.",
      powered_by_full:"Powered by Svensk eHockey →", preseason:"PRESEASON", periods_not_ready:"Fantasy periods are not ready",
      period_info_when_configured:"Period information appears once the competition is configured.", after_deadline:"After deadline", not_set:"Not set",
      test_season_current_period:"TEST SEASON / CURRENT PERIOD", live_now:"LIVE NOW", latest_period:"LATEST FANTASY PERIOD", next_period:"NEXT FANTASY PERIOD",
      published:"Published", preseason_unlimited:"PRESEASON · UNLIMITED TRANSFERS", free_transfer_period:"FREE TRANSFER PERIOD", upcoming_period:"UPCOMING PERIOD",
      transfer_window_closed:"TRANSFER WINDOW CLOSED", transfers_disabled:"TRANSFERS DISABLED",
      preseason_transfer_detail:"Rebuild freely until the first Fantasy period deadline at 18:00 Swedish time. After that: 1 free transfer per period, max 2 banked.",
      period_transfer_detail:"1 free transfer per period · max 2 banked · extra transfer costs −{cost} P. Captain changes are free.",
      no_more_transfer_periods:"No more Fantasy periods are open for transfers.", transfer_rules_inactive:"Transfer rules are not active right now.",
      setup:"SETUP", open:"OPEN", locked:"LOCKED", live:"LIVE", finished:"FINISHED", archived:"ARCHIVED",
      build_your_six:"Build your {league} six", build_six_short:"{league} SIX.", setup_intro:"{season} Fantasy is under construction.",
      beta_intro:"Pick six players, stay under budget and choose your captain. The player pool currently uses {source}.",
      normal_intro:"Pick six players, stay under budget and choose your captain. Fantasy follows the players' real games and results.",
      fantasy_preparing:"The Fantasy league is being prepared.", player_selection:"Player selection: {scope}.", pool_not_published_upper:"PLAYER POOL NOT PUBLISHED",
      under_construction_upper:"UNDER CONSTRUCTION", team_building_open_upper:"TEAM BUILDING OPEN", players_count:"{count} PLAYERS",
      season_under_construction:"{season} is under construction", pool_available:"The Fantasy pool is available.", pool_not_published:"The player pool has not been published yet.",
      waiting_for_pool_upper:"WAITING FOR PLAYER POOL", fantasy_players_kicker:"{season} / FANTASY PLAYERS", pool_published_later:"The player pool will be published later.",
      eligible_players_intro:"These are the players available in {season} Fantasy.", leaderboard_opens:"The leaderboard opens when {season} Fantasy is live.",
      leaderboard_updates:"The leaderboard updates with real Fantasy points after the games.", how_it_works:"How {league} Fantasy works",
      rules_setup_intro:"{season} Fantasy is prepared and the rules can be fine-tuned before opening.", rules_live_intro:"Build your {league} six, stay under budget and follow the points period by period.",
      budget_rule:"Your full starting six must fit within {budget} CR.", max_team_rule_title:"Max {max} from one team",
      max_team_rule:"You may select at most {max} players from the same real team.", captain_rule_title:"Captain {multiplier}×",
      captain_rule:"One player is captain and receives {percent} percent extra Fantasy points.",
      setup_period_rules:"{season} will use Fantasy periods. Deadlines, free transfers and any playoff reset will be published before the league opens.",
      scl_period_rules:"SCL is not played in fixed rounds, so Fantasy uses timed periods. Each new Fantasy period locks at 18:00 Swedish time and games are assigned by their actual start time. Transfers are unlimited before the first period. After that you get 1 free transfer per period and can bank up to 2. Free transfers reset when the playoffs begin. Extra transfers cost −10 Fantasy points and captain changes are free.",
      generic_period_rules:"Fantasy uses timed periods. Games are assigned by actual start time and transfers take effect from the next locked period.",
      login_to_build:"Log in to build your team", checking_discord:"Checking Discord login and linked player profile.",
      link_pending:"Player link awaiting approval", link_pending_text:"Your selected player profile must be approved before you can create a Fantasy team.",
      link_profile_first:"Link your player profile first", link_profile_text:"Your Discord account is logged in but does not have an approved link to a player card.",
      discord_only:"Fantasy uses Discord login", discord_only_text:"Log out from the admin/writer account and then log in with Discord.",
      linked_player:"Linked player", team_building_not_open:"Team building is not open yet.", owner_after_deadline:"Ownership after deadline",
      owned_by:"Owned by {owned} % · Captain {captain} %", unknown:"Unknown", team_not_ready:"Team not set",
      form_info:"Form & info →", show_form_stats:"View form & stats →", no_player_info:"Player information could not be loaded.",
      no_matches:"No games have been registered yet.", fantasy_points_label:"Fantasy points", matches:"Matches", points_per_match:"Points / game",
      owned:"Owned", captain:"Captain", form:"FORM", last_5_matches:"Last 5 games", outcome:"OUTPUT", registered_stats:"Registered stats",
      goals:"Goals", assists:"Assists", blocks:"Blocks", goalie_wins:"Goalie wins", saves:"Saves", shutouts:"Shutouts",
      leaderboard_empty:"The leaderboard is empty. It fills when Fantasy teams are created.", show_team:"View team →",
      saved_points:"SAVED {league} POINTS", league_points:"{league} POINTS", replace_invalid:"REPLACE INVALID PLAYER", replace_unavailable:"REPLACE REMOVED PLAYER",
      choose_six:"CHOOSE 6 PLAYERS", choose_captain:"CHOOSE CAPTAIN", over_budget:"OVER BUDGET", team_saved:"{league} TEAM SAVED",
      update_team:"UPDATE {league} TEAM", save_league_team:"SAVE {league} TEAM", choose_slot:"Choose {slot}", eligible_count:"{count} eligible",
      awaiting_real_matches:"Waiting for real games", club_upper:"CLUB", invalid_slot:"Invalid as {slot} · choose Swap", unavailable_player:"No longer on the current SCL roster · replace for free before the deadline",
      make_captain:"Make captain", swap:"Swap", captain_upper_action:"CAPTAIN", no_match_points:"No match points registered",
      points_remain:"Points remain in the total", choose_position:"Choose position", add:"Add", no_pool:"The player pool has not been published yet.",
      ownership_period_default:"latest locked Fantasy period", locked_fantasy_teams:"{entries} locked Fantasy teams",
      ownership_after_note:"Ownership and captain percentages are shown after the Fantasy period deadline.", loading_form:"loading form and stats…",
      could_not_load_player:"Could not load player", unnamed_team:"Unnamed team", goalie_games_count:"goalie games counted",
      skater_games_count:"skater games counted", hidden_team:"Team is hidden", locked_team_default:"Locked team",
      locked_lineup_note:"This is the latest locked lineup. Upcoming transfers are hidden until the next deadline.",
      no_locked_lineup:"No locked lineup found.", points_remain_total:"Points remain in the team total",
      loading_locked_team:"Loading locked team…", could_not_load_team:"Could not load team", selected:"Selected",
      no_players_match:"No players match the filter.", player_profile_upper:"PLAYER PROFILE / FANTASY", match_singular:"Match",
      league_lower:"league", ownership_from:"Ownership from {period} · {entries} locked Fantasy teams.",
      open_discord:"Opening Discord…", must_login_save:"You must be logged in and have an approved linked player profile.",
      choose_all_six:"Choose all six positions before saving.", team_over_budget:"The team is over budget.",
      choose_exact_captain:"Choose exactly one captain.", saving_team:"Saving team…", team_updated:"{league} team updated.",
      team_saved_success:"{league} team saved.", captain_position_free:"Captain changes and position changes are free.",
      choose_league_option:"Choose Fantasy league…", neutral_hero_kicker:"eHOCKEY FANTASY", neutral_hero_first:"eHOCKEY",
      neutral_hero_second:"FANTASY LEAGUE.", neutral_hero_lead:"Choose a Fantasy league from the menu above to open the competition.",
      neutral_choose_league:"CHOOSE FANTASY LEAGUE",
      swap_player:"Swap {name}", picker_count:"{count} players available for {slot}", pick_slot_upper:"CHOOSE {slot}",
      team_limit_reached:"{limit}/{limit} FROM TEAM", no_eligible_for_slot:"No eligible players for {slot}.",
      player_can_use_on:"{name} can be used at {slots}.", choose_open_slot:"Choose which open slot the player should take.",
      goalie_games_only:"only goalie games count", skater_games_only:"only skater games count"
    },
    fi: {
      nav_build:"RAKENNA", nav_compete:"KILPAILE", nav_climb:"NOUSE", league:"LIIGA", language:"KIELI",
      choose_fantasy_league:"Valitse Fantasy-liiga", choose_language:"Valitse kieli", powered_by:"PALVELUN TARJOAA",
      login_discord:"Kirjaudu Discordilla", see_rules:"Katso säännöt", players_upper:"PELAAJAT", budget_upper:"BUDJETTI",
      max_per_team_upper:"MAX / JOUKKUE", captain_upper:"KAPTEENI", start_upper:"ALKU", status_upper:"TILA",
      fantasy_teams_upper:"FANTASY-JOUKKUEET", beta_source_upper:"BETA-LÄHDE", selection_upper:"VALINTA", mode_upper:"TILA", player_pool_upper:"PELAAJAPOOLI",
      price_range_upper:"HINTAHAARUKKA", access_upper:"PÄÄSY", access_value:"DISCORD + LINKITETTY PROFIILI", matches_upper:"OTTELUT",
      registered:"rekisteröity", created:"luotu", ownership_info_upper:"OMISTUS", locked_period:"lukittu jakso", deadline_upper:"DEADLINE",
      swedish_time:"Ruotsin aika", my_team:"Joukkueeni", players:"Pelaajat", leaderboard:"Sarjataulukko", rules:"Säännöt",
      account_required_upper:"TILI VAADITAAN", checking_account:"Tarkistetaan tiliäsi…",
      account_required_text:"Sinun on kirjauduttava Discordilla ja sinulla on oltava hyväksytty linkitetty pelaajaprofiili joukkueen luomiseksi.",
      connect_profile:"Linkitä pelaajaprofiili", team_manager_upper:"JOUKKUEEN OMISTAJA", account_upper:"TILI", logout:"Kirjaudu ulos",
      fantasy_team_upper:"FANTASY-JOUKKUE", team_name_follows_profile:"Nimi seuraa linkitettyä pelaajaprofiiliasi", squad_upper:"KOKOONPANO",
      used_upper:"KÄYTETTY", remaining_upper:"JÄLJELLÄ", transfers_upper:"VAIHDOT", free_upper:"ILMAISET", next_upper:"SEURAAVA",
      starting_six_upper:"AVAUSKUUSIKKO", your_starting_six:"Avauskuusikkosi", team_history_upper:"JOUKKUEHISTORIA",
      former_players:"Entiset pelaajat", former_players_note:"Pelaajien keräämät pisteet säilyvät joukkueen kokonaispisteissä heidän poistumisensa jälkeenkin.",
      player_market_upper:"PELAAJAMARKKINA", player_list:"Pelaajalista", search_player_team_upper:"HAE PELAAJAA / JOUKKUETTA", search_placeholder:"Gamertag tai joukkue…",
      position_upper:"PELIPAIKKA", all:"Kaikki", team_status_upper:"JOUKKUEEN TILA", save_team:"Tallenna joukkue", fantasy_players:"Fantasy-pelaajat",
      leaderboard_upper:"SARJATAULUKKO", rules_upper:"SÄÄNNÖT", six_players:"Kuusi pelaajaa",
      six_players_text:"LW, C, RW, LD, RD ja G. Sama pelaaja voidaan valita vain kerran. Dokumentoidun pelipaikkahistorian perusteella pelaaja voi olla valittavissa usealle paikalle.",
      fantasy_points:"Fantasy-pisteet", position_per_match_text:"<strong>Pelipaikka ottelukohtaisesti:</strong> Kenttäpelaajien paikoilla lasketaan vain ottelut, joissa pelaaja todella pelaa hyökkääjänä tai puolustajana, ja pistekaava määräytyy todellisen pelipaikan mukaan. G-paikalla lasketaan vain maalivahtina pelatut ottelut. Selkeät maalivahdit ja kenttäpelaajat erotellaan ennen turnausta historian perusteella; aidot hybridit voivat olla valittavissa molempiin rooleihin.",
      event:"Tapahtuma", played_match:"Pelattu ottelu", goal:"Maali", assist:"Syöttö", game_winning_goal:"Voittomaali", block:"Blokki", win:"Voitto",
      save:"Torjunta", shutout:"Nollapeli", goal_allowed:"Päästetty maali",
      ecl_divisions_text:"<strong>ECL-divisioonat:</strong> Ottelun SportsGamer-liiga-ID määrittää pistekertoimen. Joukkueen vaihto saman divisioonan sisällä ei vaikuta Fantasyyn. Jos pelaaja vaihtaa divisioonaa, vain uudet ottelut käyttävät uutta kerrointa.",
      gcl_divisions_text:"<strong>GCL-divisioonat:</strong> Div 1 saa pienen bonuksen kovemman vastuksen vuoksi. Div 2 käyttää normaalia kerrointa.",
      division:"Divisioona", factor:"Kerroin", example_40_raw:"Esimerkki: 40 raakapistettä", verified_account:"Vahvistettu tili",
      verified_account_text:"Kaikki voivat nähdä sivun ja pelaajapoolin. Joukkueen luominen vaatii Discord-kirjautumisen ja hyväksytyn Fantasy-oikeuden, tavallisesti linkitetyn Svensk eHockey -pelaajaprofiilin kautta.",
      periods_and_transfers:"Fantasy-jaksot ja vaihdot", close:"Sulje", choose_player:"Valitse pelaaja", eligible_players_for_position:"Tälle pelipaikalle sopivat pelaajat.",
      choose_position_upper:"VALITSE PELIPAIKKA", place_player:"Sijoita pelaaja", place_player_text:"Pelaaja voidaan käyttää usealla pelipaikalla. Valitse paikka Fantasy-joukkueessasi.",
      powered_by_full:"Palvelun tarjoaa Svensk eHockey →", preseason:"ENNEN KAUTTA", periods_not_ready:"Fantasy-jaksot eivät ole vielä valmiit",
      period_info_when_configured:"Jakson tiedot näkyvät, kun kilpailu on määritetty.", after_deadline:"Deadlinen jälkeen", not_set:"Ei asetettu",
      test_season_current_period:"TESTIKAUSI / NYKYINEN JAKSO", live_now:"KÄYNNISSÄ", latest_period:"VIIMEISIN FANTASY-JAKSO", next_period:"SEURAAVA FANTASY-JAKSO",
      published:"Julkaistu", preseason_unlimited:"ENNEN KAUTTA · RAJATTOMAT VAIHDOT", free_transfer_period:"ILMAINEN VAIHTOJAKSO", upcoming_period:"TULEVA JAKSO",
      transfer_window_closed:"VAIHTOIKKUNA SULJETTU", transfers_disabled:"VAIHDOT POIS KÄYTÖSTÄ",
      preseason_transfer_detail:"Muokkaa joukkuetta vapaasti ensimmäisen Fantasy-jakson deadlineen klo 18.00 Ruotsin aikaa asti. Sen jälkeen: 1 ilmainen vaihto per jakso, enintään 2 säästöön.",
      period_transfer_detail:"1 ilmainen vaihto per jakso · enintään 2 säästöön · ylimääräinen vaihto maksaa −{cost} P. Kapteenin vaihto on ilmainen.",
      no_more_transfer_periods:"Yhtään Fantasy-jaksoa ei ole enää avoinna vaihdoille.", transfer_rules_inactive:"Vaihtosäännöt eivät ole juuri nyt aktiivisia.",
      setup:"VALMISTELU", open:"AVOINNA", locked:"LUKITTU", live:"KÄYNNISSÄ", finished:"PÄÄTTYNYT", archived:"ARKISTOITU",
      build_your_six:"Rakenna {league}-kuusikkosi", build_six_short:"{league}-KUUSIKKO.", setup_intro:"{season} Fantasy on rakenteilla.",
      beta_intro:"Valitse kuusi pelaajaa, pysy budjetissa ja nimeä kapteeni. Pelaajapooli perustuu tällä hetkellä lähteeseen {source}.",
      normal_intro:"Valitse kuusi pelaajaa, pysy budjetissa ja nimeä kapteeni. Fantasy seuraa pelaajien oikeita otteluita ja tuloksia.",
      fantasy_preparing:"Fantasy-liigaa valmistellaan.", player_selection:"Pelaajavalinta: {scope}.", pool_not_published_upper:"PELAAJAPOOLIA EI OLE JULKAISTU",
      under_construction_upper:"RAKENTEILLA", team_building_open_upper:"JOUKKUEEN RAKENNUS AUKI", players_count:"{count} PELAAJAA",
      season_under_construction:"{season} on rakenteilla", pool_available:"Fantasy-pooli on käytettävissä.", pool_not_published:"Pelaajapoolia ei ole vielä julkaistu.",
      waiting_for_pool_upper:"ODOTTAA PELAAJAPOOLIA", fantasy_players_kicker:"{season} / FANTASY-PELAAJAT", pool_published_later:"Pelaajapooli julkaistaan myöhemmin.",
      eligible_players_intro:"Tässä ovat pelaajat, jotka ovat valittavissa {season} Fantasyssa.", leaderboard_opens:"Sarjataulukko avautuu, kun {season} Fantasy käynnistyy.",
      leaderboard_updates:"Sarjataulukko päivittyy oikeilla Fantasy-pisteillä otteluiden jälkeen.", how_it_works:"Näin {league} Fantasy toimii",
      rules_setup_intro:"{season} Fantasy on valmisteltu ja sääntöjä voidaan vielä hienosäätää ennen avaamista.", rules_live_intro:"Rakenna {league}-kuusikkosi, pysy budjetissa ja seuraa pisteitä jaksoittain.",
      budget_rule:"Koko avauskuusikon on mahduttava {budget} CR:n budjettiin.", max_team_rule_title:"Enintään {max} samasta joukkueesta",
      max_team_rule:"Voit valita enintään {max} pelaajaa samasta oikeasta joukkueesta.", captain_rule_title:"Kapteeni {multiplier}×",
      captain_rule:"Yksi pelaaja nimetään kapteeniksi ja saa {percent} prosenttia ylimääräisiä Fantasy-pisteitä.",
      setup_period_rules:"{season} käyttää Fantasy-jaksoja. Deadlinet, ilmaiset vaihdot ja mahdollinen pudotuspelien nollaus julkaistaan ennen liigan avaamista.",
      scl_period_rules:"SCL:ää ei pelata kiinteissä kierroksissa, joten Fantasy käyttää aikajaksoja. Jokainen uusi jakso lukitaan klo 18.00 Ruotsin aikaa ja ottelut sijoitetaan todellisen alkamisajan mukaan. Ennen ensimmäistä jaksoa vaihdot ovat rajattomia. Sen jälkeen saat 1 ilmaisen vaihdon per jakso ja voit säästää enintään 2. Ilmaiset vaihdot palautetaan pudotuspelien alkaessa. Ylimääräiset vaihdot maksavat −10 Fantasy-pistettä ja kapteenin vaihto on ilmainen.",
      generic_period_rules:"Fantasy käyttää aikajaksoja. Ottelut sijoitetaan todellisen alkamisajan mukaan ja vaihdot astuvat voimaan seuraavasta lukitusta jaksosta.",
      login_to_build:"Kirjaudu rakentaaksesi joukkueesi", checking_discord:"Tarkistetaan Discord-kirjautuminen ja linkitetty pelaajaprofiili.",
      link_pending:"Pelaajalinkitys odottaa hyväksyntää", link_pending_text:"Valittu pelaajaprofiili on hyväksyttävä ennen Fantasy-joukkueen luomista.",
      link_profile_first:"Linkitä pelaajaprofiilisi ensin", link_profile_text:"Discord-tili on kirjautunut sisään, mutta sillä ei ole hyväksyttyä linkitystä pelaajakorttiin.",
      discord_only:"Fantasy käyttää Discord-kirjautumista", discord_only_text:"Kirjaudu ulos admin-/kirjoittajatililtä ja kirjaudu sitten Discordilla.",
      linked_player:"Linkitetty pelaaja", team_building_not_open:"Joukkueen rakentaminen ei ole vielä avoinna.", owner_after_deadline:"Omistus deadlinen jälkeen",
      owned_by:"Omistus {owned} % · Kapteeni {captain} %", unknown:"Tuntematon", team_not_ready:"Joukkue ei valmis",
      form_info:"Vire & tiedot →", show_form_stats:"Näytä vire & tilastot →", no_player_info:"Pelaajatietoja ei voitu ladata.",
      no_matches:"Otteluita ei ole vielä rekisteröity.", fantasy_points_label:"Fantasy-pisteet", matches:"Ottelut", points_per_match:"Pistettä / ottelu",
      owned:"Omistus", captain:"Kapteeni", form:"VIRE", last_5_matches:"Viimeiset 5 ottelua", outcome:"TULOS", registered_stats:"Rekisteröidyt tilastot",
      goals:"Maalit", assists:"Syötöt", blocks:"Blokit", goalie_wins:"MV-voitot", saves:"Torjunnat", shutouts:"Nollapelit",
      leaderboard_empty:"Sarjataulukko on tyhjä. Se täyttyy, kun Fantasy-joukkueita luodaan.", show_team:"Näytä joukkue →",
      saved_points:"TALLENNETUT {league}-PISTEET", league_points:"{league}-PISTEET", replace_invalid:"VAIHDA VIRHEELLINEN PELAAJA", replace_unavailable:"VAIHDA POISTETTU PELAAJA",
      choose_six:"VALITSE 6 PELAAJAA", choose_captain:"VALITSE KAPTEENI", over_budget:"BUDJETTI YLITTYI", team_saved:"{league}-JOUKKUE TALLENNETTU",
      update_team:"PÄIVITÄ {league}-JOUKKUE", save_league_team:"TALLENNA {league}-JOUKKUE", choose_slot:"Valitse {slot}", eligible_count:"{count} valittavissa",
      awaiting_real_matches:"Odottaa oikeita otteluita", club_upper:"SEURA", invalid_slot:"Ei kelpaa paikalle {slot} · valitse Vaihda", unavailable_player:"Ei enää nykyisessä SCL-kokoonpanossa · vaihda ilmaiseksi ennen määräaikaa",
      make_captain:"Tee kapteeniksi", swap:"Vaihda", captain_upper_action:"KAPTEENI", no_match_points:"Ei rekisteröityjä ottelupisteitä",
      points_remain:"Pisteet säilyvät kokonaispisteissä", choose_position:"Valitse pelipaikka", add:"Lisää", no_pool:"Pelaajapoolia ei ole vielä julkaistu.",
      ownership_period_default:"viimeisin lukittu Fantasy-jakso", locked_fantasy_teams:"{entries} lukittua Fantasy-joukkuetta",
      ownership_after_note:"Omistus- ja kapteeniprosentit näytetään Fantasy-jakson deadlinen jälkeen.", loading_form:"ladataan virettä ja tilastoja…",
      could_not_load_player:"Pelaajaa ei voitu ladata", unnamed_team:"Nimetön joukkue", goalie_games_count:"maalivahtiottelut lasketaan",
      skater_games_count:"kenttäpelaajaottelut lasketaan", hidden_team:"Joukkue on piilotettu", locked_team_default:"Lukittu joukkue",
      locked_lineup_note:"Tämä on viimeisin lukittu kokoonpano. Tulevat vaihdot eivät näy ennen seuraavaa deadlinea.",
      no_locked_lineup:"Lukittua kokoonpanoa ei löytynyt.", points_remain_total:"Pisteet säilyvät joukkueen kokonaispisteissä",
      loading_locked_team:"Ladataan lukittua joukkuetta…", could_not_load_team:"Joukkuetta ei voitu ladata", selected:"Valittu",
      no_players_match:"Yksikään pelaaja ei vastaa suodatusta.", player_profile_upper:"PELAAJAPROFIILI / FANTASY", match_singular:"Ottelu",
      league_lower:"liiga", ownership_from:"Omistus jaksosta {period} · {entries} lukittua Fantasy-joukkuetta.",
      open_discord:"Avataan Discord…", must_login_save:"Sinun on kirjauduttava sisään ja sinulla on oltava hyväksytty linkitetty pelaajaprofiili.",
      choose_all_six:"Valitse kaikki kuusi pelipaikkaa ennen tallennusta.", team_over_budget:"Joukkue ylittää budjetin.",
      choose_exact_captain:"Valitse täsmälleen yksi kapteeni.", saving_team:"Tallennetaan joukkuetta…", team_updated:"{league}-joukkue päivitetty.",
      team_saved_success:"{league}-joukkue tallennettu.", captain_position_free:"Kapteenin vaihto ja pelipaikan muutos ovat ilmaisia.",
      choose_league_option:"Valitse Fantasy-liiga…", neutral_hero_kicker:"eHOCKEY FANTASY", neutral_hero_first:"eHOCKEY",
      neutral_hero_second:"FANTASY-LIIGA.", neutral_hero_lead:"Valitse Fantasy-liiga yllä olevasta valikosta avataksesi kilpailun.",
      neutral_choose_league:"VALITSE FANTASY-LIIGA",
      swap_player:"Vaihda {name}", picker_count:"{count} pelaajaa käytettävissä paikalle {slot}", pick_slot_upper:"VALITSE {slot}",
      team_limit_reached:"{limit}/{limit} SAMASTA JOUKKUEESTA", no_eligible_for_slot:"Ei valittavia pelaajia paikalle {slot}.",
      player_can_use_on:"{name} voidaan käyttää paikoilla {slots}.", choose_open_slot:"Valitse vapaa paikka pelaajalle.",
      goalie_games_only:"vain maalivahtina pelatut ottelut lasketaan", skater_games_only:"vain kenttäpelaajana pelatut ottelut lasketaan"
    },
    de: {
      nav_build:"BAUEN", nav_compete:"SPIELEN", nav_climb:"STEIGEN", league:"LIGA", language:"SPRACHE",
      choose_fantasy_league:"Fantasy-Liga wählen", choose_language:"Sprache wählen", powered_by:"BETRIEBEN VON",
      login_discord:"Mit Discord anmelden", see_rules:"Regeln ansehen", players_upper:"SPIELER", budget_upper:"BUDGET",
      max_per_team_upper:"MAX / TEAM", captain_upper:"KAPITÄN", start_upper:"START", status_upper:"STATUS",
      fantasy_teams_upper:"FANTASY-TEAMS", beta_source_upper:"BETA-QUELLE", selection_upper:"AUSWAHL", mode_upper:"MODUS", player_pool_upper:"SPIELERPOOL",
      price_range_upper:"PREISSPANNE", access_upper:"ZUGANG", access_value:"DISCORD + VERKNÜPFTES PROFIL", matches_upper:"SPIELE",
      registered:"erfasst", created:"erstellt", ownership_info_upper:"BESITZ", locked_period:"gesperrte Periode", deadline_upper:"DEADLINE",
      swedish_time:"schwedische Zeit", my_team:"Mein Team", players:"Spieler", leaderboard:"Rangliste", rules:"Regeln",
      account_required_upper:"KONTO ERFORDERLICH", checking_account:"Konto wird geprüft…",
      account_required_text:"Du musst mit Discord angemeldet sein und ein genehmigtes verknüpftes Spielerprofil haben, um ein Team zu erstellen.",
      connect_profile:"Spielerprofil verknüpfen", team_manager_upper:"TEAMVERANTWORTLICHER", account_upper:"KONTO", logout:"Abmelden",
      fantasy_team_upper:"FANTASY-TEAM", team_name_follows_profile:"Der Name folgt deinem verknüpften Spielerprofil", squad_upper:"KADER",
      used_upper:"VERBRAUCHT", remaining_upper:"ÜBRIG", transfers_upper:"TRANSFERS", free_upper:"GRATIS", next_upper:"NÄCHSTER",
      starting_six_upper:"STARTSECHS", your_starting_six:"Deine Startsechs", team_history_upper:"TEAMHISTORIE",
      former_players:"Ehemalige Spieler", former_players_note:"Die Punkte, die sie in deinem Team gesammelt haben, bleiben in der Gesamtsumme.",
      player_market_upper:"SPIELERMARKT", player_list:"Spielerliste", search_player_team_upper:"SPIELER / TEAM SUCHEN", search_placeholder:"Gamertag oder Team…",
      position_upper:"POSITION", all:"Alle", team_status_upper:"TEAMSTATUS", save_team:"Team speichern", fantasy_players:"Fantasy-Spieler",
      leaderboard_upper:"RANGLISTE", rules_upper:"REGELN", six_players:"Sechs Spieler",
      six_players_text:"LW, C, RW, LD, RD und G. Derselbe Spieler kann nur einmal gewählt werden. Spieler mit dokumentierter Positionshistorie können auf mehreren Plätzen verfügbar sein.",
      fantasy_points:"Fantasy-Punkte", position_per_match_text:"<strong>Position pro Spiel:</strong> Auf Feldspielerplätzen zählen nur Spiele, in denen der Spieler tatsächlich als Stürmer oder Verteidiger spielt; die Punkteformel folgt der echten Position in jedem Spiel. Auf dem G-Platz zählen nur Spiele als Torhüter. Eindeutige Torhüter und Feldspieler werden anhand der Historie vor dem Turnier getrennt; echte Hybride können für beide Rollen verfügbar sein.",
      event:"Ereignis", played_match:"Gespieltes Spiel", goal:"Tor", assist:"Assist", game_winning_goal:"Siegtreffer", block:"Block", win:"Sieg",
      save:"Parade", shutout:"Shutout", goal_allowed:"Gegentor",
      ecl_divisions_text:"<strong>ECL-Divisionen:</strong> Die SportsGamer-Liga-ID des Spiels bestimmt den Punktefaktor. Ein Teamwechsel innerhalb derselben Division beeinflusst Fantasy nicht. Wechselt ein Spieler die Division, gilt der neue Faktor nur für neue Spiele.",
      gcl_divisions_text:"<strong>GCL-Divisionen:</strong> Div 1 erhält einen kleinen Bonus, weil die Gegner stärker sind. Div 2 nutzt den normalen Faktor.",
      division:"Division", factor:"Faktor", example_40_raw:"Beispiel: 40 Rohpunkte", verified_account:"Verifiziertes Konto",
      verified_account_text:"Jeder kann die Seite und den Spielerpool sehen. Für ein Team sind Discord-Anmeldung und genehmigter Fantasy-Zugang nötig, normalerweise über ein verknüpftes Svensk eHockey-Spielerprofil.",
      periods_and_transfers:"Fantasy-Perioden und Transfers", close:"Schließen", choose_player:"Spieler wählen", eligible_players_for_position:"Verfügbare Spieler für diese Position.",
      choose_position_upper:"POSITION WÄHLEN", place_player:"Spieler platzieren", place_player_text:"Der Spieler kann auf mehreren Positionen eingesetzt werden. Wähle seinen Platz in deinem Fantasy-Team.",
      powered_by_full:"Betrieben von Svensk eHockey →", preseason:"VORSAISON", periods_not_ready:"Fantasy-Perioden sind noch nicht bereit",
      period_info_when_configured:"Periodeninformationen erscheinen, sobald der Wettbewerb konfiguriert ist.", after_deadline:"Nach Deadline", not_set:"Nicht gesetzt",
      test_season_current_period:"TESTSAISON / AKTUELLE PERIODE", live_now:"JETZT LIVE", latest_period:"LETZTE FANTASY-PERIODE", next_period:"NÄCHSTE FANTASY-PERIODE",
      published:"Veröffentlicht", preseason_unlimited:"VORSAISON · UNBEGRENZTE TRANSFERS", free_transfer_period:"FREIE TRANSFERPERIODE", upcoming_period:"KOMMENDE PERIODE",
      transfer_window_closed:"TRANSFERFENSTER GESCHLOSSEN", transfers_disabled:"TRANSFERS DEAKTIVIERT",
      preseason_transfer_detail:"Bis zur Deadline der ersten Fantasy-Periode um 18:00 Uhr schwedischer Zeit kannst du frei umbauen. Danach: 1 Gratis-Transfer pro Periode, maximal 2 ansparbar.",
      period_transfer_detail:"1 Gratis-Transfer pro Periode · max. 2 ansparbar · zusätzlicher Transfer kostet −{cost} P. Kapitänswechsel sind gratis.",
      no_more_transfer_periods:"Keine weiteren Fantasy-Perioden sind für Transfers geöffnet.", transfer_rules_inactive:"Die Transferregeln sind aktuell nicht aktiv.",
      setup:"EINRICHTUNG", open:"OFFEN", locked:"GESPERRT", live:"LIVE", finished:"BEENDET", archived:"ARCHIVIERT",
      build_your_six:"Baue deine {league}-Sechs", build_six_short:"{league}-SECHS.", setup_intro:"{season} Fantasy wird vorbereitet.",
      beta_intro:"Wähle sechs Spieler, bleibe im Budget und bestimme deinen Kapitän. Der Spielerpool basiert derzeit auf {source}.",
      normal_intro:"Wähle sechs Spieler, bleibe im Budget und bestimme deinen Kapitän. Fantasy folgt den echten Spielen und Ergebnissen der Spieler.",
      fantasy_preparing:"Die Fantasy-Liga wird vorbereitet.", player_selection:"Spielerauswahl: {scope}.", pool_not_published_upper:"SPIELERPOOL NICHT VERÖFFENTLICHT",
      under_construction_upper:"IN VORBEREITUNG", team_building_open_upper:"TEAMBAU OFFEN", players_count:"{count} SPIELER",
      season_under_construction:"{season} wird vorbereitet", pool_available:"Der Fantasy-Pool ist verfügbar.", pool_not_published:"Der Spielerpool ist noch nicht veröffentlicht.",
      waiting_for_pool_upper:"WARTET AUF SPIELERPOOL", fantasy_players_kicker:"{season} / FANTASY-SPIELER", pool_published_later:"Der Spielerpool wird später veröffentlicht.",
      eligible_players_intro:"Hier siehst du die in {season} Fantasy verfügbaren Spieler.", leaderboard_opens:"Die Rangliste öffnet, wenn {season} Fantasy startet.",
      leaderboard_updates:"Die Rangliste wird nach den Spielen mit echten Fantasy-Punkten aktualisiert.", how_it_works:"So funktioniert {league} Fantasy",
      rules_setup_intro:"{season} Fantasy ist vorbereitet und die Regeln können vor dem Start noch angepasst werden.", rules_live_intro:"Baue deine {league}-Sechs, bleibe im Budget und verfolge die Punkte Periode für Periode.",
      budget_rule:"Deine gesamte Startsechs muss in {budget} CR passen.", max_team_rule_title:"Max. {max} aus einem Team",
      max_team_rule:"Du darfst höchstens {max} Spieler aus demselben echten Team wählen.", captain_rule_title:"Kapitän {multiplier}×",
      captain_rule:"Ein Spieler wird zum Kapitän und erhält {percent} Prozent zusätzliche Fantasy-Punkte.",
      setup_period_rules:"{season} wird Fantasy-Perioden verwenden. Deadlines, Gratis-Transfers und ein möglicher Playoff-Reset werden vor dem Start veröffentlicht.",
      scl_period_rules:"SCL wird nicht in festen Runden gespielt, daher nutzt Fantasy Zeitperioden. Jede neue Periode wird um 18:00 Uhr schwedischer Zeit gesperrt; Spiele werden nach ihrer tatsächlichen Startzeit zugeordnet. Vor der ersten Periode sind Transfers unbegrenzt. Danach gibt es 1 Gratis-Transfer pro Periode, maximal 2 ansparbar. Zum Beginn der Playoffs werden die Gratis-Transfers zurückgesetzt. Zusätzliche Transfers kosten −10 Fantasy-Punkte, Kapitänswechsel sind gratis.",
      generic_period_rules:"Fantasy nutzt Zeitperioden. Spiele werden nach ihrer tatsächlichen Startzeit zugeordnet; Transfers gelten ab der nächsten gesperrten Periode.",
      login_to_build:"Anmelden, um dein Team zu bauen", checking_discord:"Discord-Anmeldung und verknüpftes Spielerprofil werden geprüft.",
      link_pending:"Spielerverknüpfung wartet auf Freigabe", link_pending_text:"Dein ausgewähltes Spielerprofil muss genehmigt werden, bevor du ein Fantasy-Team erstellen kannst.",
      link_profile_first:"Verknüpfe zuerst dein Spielerprofil", link_profile_text:"Dein Discord-Konto ist angemeldet, hat aber keine genehmigte Verknüpfung mit einer Spielerkarte.",
      discord_only:"Fantasy verwendet Discord-Anmeldung", discord_only_text:"Melde dich vom Admin-/Autorenkonto ab und dann mit Discord an.",
      linked_player:"Verknüpfter Spieler", team_building_not_open:"Der Teambau ist noch nicht geöffnet.", owner_after_deadline:"Besitz nach Deadline",
      owned_by:"Besitz {owned} % · Kapitän {captain} %", unknown:"Unbekannt", team_not_ready:"Team noch offen",
      form_info:"Form & Info →", show_form_stats:"Form & Statistiken →", no_player_info:"Spielerinformationen konnten nicht geladen werden.",
      no_matches:"Noch keine Spiele registriert.", fantasy_points_label:"Fantasy-Punkte", matches:"Spiele", points_per_match:"Punkte / Spiel",
      owned:"Besitz", captain:"Kapitän", form:"FORM", last_5_matches:"Letzte 5 Spiele", outcome:"ERGEBNIS", registered_stats:"Registrierte Statistiken",
      goals:"Tore", assists:"Assists", blocks:"Blocks", goalie_wins:"Torhüter-Siege", saves:"Paraden", shutouts:"Shutouts",
      leaderboard_empty:"Die Rangliste ist leer. Sie füllt sich, sobald Fantasy-Teams erstellt werden.", show_team:"Team ansehen →",
      saved_points:"GESPEICHERTE {league}-PUNKTE", league_points:"{league}-PUNKTE", replace_invalid:"UNGÜLTIGEN SPIELER ERSETZEN", replace_unavailable:"ENTFERNTEN SPIELER ERSETZEN",
      choose_six:"6 SPIELER WÄHLEN", choose_captain:"KAPITÄN WÄHLEN", over_budget:"ÜBER BUDGET", team_saved:"{league}-TEAM GESPEICHERT",
      update_team:"{league}-TEAM AKTUALISIEREN", save_league_team:"{league}-TEAM SPEICHERN", choose_slot:"{slot} wählen", eligible_count:"{count} verfügbar",
      awaiting_real_matches:"Wartet auf echte Spiele", club_upper:"VEREIN", invalid_slot:"Ungültig als {slot} · Wechseln wählen", unavailable_player:"Nicht mehr im aktuellen SCL-Kader · vor der Deadline kostenlos ersetzen",
      make_captain:"Zum Kapitän machen", swap:"Wechseln", captain_upper_action:"KAPITÄN", no_match_points:"Keine Spielpunkte registriert",
      points_remain:"Punkte bleiben in der Gesamtsumme", choose_position:"Position wählen", add:"Hinzufügen", no_pool:"Der Spielerpool ist noch nicht veröffentlicht.",
      ownership_period_default:"letzte gesperrte Fantasy-Periode", locked_fantasy_teams:"{entries} gesperrte Fantasy-Teams",
      ownership_after_note:"Besitz- und Kapitänsanteile werden nach der Deadline der Fantasy-Periode angezeigt.", loading_form:"Form und Statistiken werden geladen…",
      could_not_load_player:"Spieler konnte nicht geladen werden", unnamed_team:"Unbenanntes Team", goalie_games_count:"Torhüterspiele zählen",
      skater_games_count:"Feldspielerspiele zählen", hidden_team:"Team ist verborgen", locked_team_default:"Gesperrtes Team",
      locked_lineup_note:"Dies ist die zuletzt gesperrte Aufstellung. Kommende Transfers werden erst nach der nächsten Deadline angezeigt.",
      no_locked_lineup:"Keine gesperrte Aufstellung gefunden.", points_remain_total:"Punkte bleiben in der Team-Gesamtsumme",
      loading_locked_team:"Gesperrtes Team wird geladen…", could_not_load_team:"Team konnte nicht geladen werden", selected:"Ausgewählt",
      no_players_match:"Keine Spieler entsprechen dem Filter.", player_profile_upper:"SPIELERPROFIL / FANTASY", match_singular:"Spiel",
      league_lower:"Liga", ownership_from:"Besitz aus {period} · {entries} gesperrte Fantasy-Teams.",
      open_discord:"Discord wird geöffnet…", must_login_save:"Du musst angemeldet sein und ein genehmigtes verknüpftes Spielerprofil haben.",
      choose_all_six:"Wähle alle sechs Positionen, bevor du speicherst.", team_over_budget:"Das Team liegt über dem Budget.",
      choose_exact_captain:"Wähle genau einen Kapitän.", saving_team:"Team wird gespeichert…", team_updated:"{league}-Team aktualisiert.",
      team_saved_success:"{league}-Team gespeichert.", captain_position_free:"Kapitäns- und Positionswechsel sind kostenlos.",
      choose_league_option:"Fantasy-Liga wählen…", neutral_hero_kicker:"eHOCKEY FANTASY", neutral_hero_first:"eHOCKEY",
      neutral_hero_second:"FANTASY-LIGA.", neutral_hero_lead:"Wähle oben eine Fantasy-Liga aus, um den Wettbewerb zu öffnen.",
      neutral_choose_league:"FANTASY-LIGA WÄHLEN",
      swap_player:"{name} wechseln", picker_count:"{count} Spieler für {slot} verfügbar", pick_slot_upper:"{slot} WÄHLEN",
      team_limit_reached:"{limit}/{limit} AUS DEM TEAM", no_eligible_for_slot:"Keine verfügbaren Spieler für {slot}.",
      player_can_use_on:"{name} kann auf {slots} eingesetzt werden.", choose_open_slot:"Wähle einen freien Platz für den Spieler.",
      goalie_games_only:"nur Torhüter-Spiele zählen", skater_games_only:"nur Feldspieler-Spiele zählen"
    }
  };

  function initialLanguage() {
    const params = new URLSearchParams(window.location.search);
    const urlLang = clean(params.get("lang")).toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(urlLang)) return urlLang;
    const competition = clean(params.get("competition") || "default").toUpperCase();
    const storedForCompetition = clean(localStorage.getItem("ehockey-fantasy-language:" + competition)).toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(storedForCompetition)) return storedForCompetition;
    const stored = clean(localStorage.getItem("ehockey-fantasy-language")).toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(stored)) return stored;
    const browser = clean(navigator.language).slice(0,2).toLowerCase();
    return SUPPORTED_LANGUAGES.includes(browser) ? browser : "sv";
  }

  function t(key, vars = {}) {
    const lang = (typeof state !== "undefined" && state?.language) || initialLanguage();
    let text = I18N[lang]?.[key] ?? I18N.sv[key] ?? key;
    for (const [name,value] of Object.entries(vars)) {
      text = String(text).replaceAll("{" + name + "}", String(value));
    }
    return text;
  }

  function applyStaticTranslations() {
    const lang = (typeof state !== "undefined" && state?.language) || initialLanguage();
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((node) => {
      const value = t(node.dataset.i18n);
      if (value.includes("<")) node.innerHTML = value;
      else node.textContent = value;
    });
    $$("[data-i18n-placeholder]").forEach((node) => {
      node.placeholder = t(node.dataset.i18nPlaceholder);
    });
    $$("[data-i18n-aria-label]").forEach((node) => {
      node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
    });
    if ($("languageSelect")) $("languageSelect").value = lang;
    if ($("languageFlag")) $("languageFlag").textContent = LANGUAGE_FLAGS[lang] || "🌐";
  }

  function setLanguage(lang) {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    state.language = lang;
    localStorage.setItem("ehockey-fantasy-language", lang);
    localStorage.setItem("ehockey-fantasy-language:" + competitionCode(), lang);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    history.replaceState({}, "", url);
    renderAll();

    if (!$("accountGate")?.hidden) {
      if (!state.session?.user) showGate("logged-out");
      else if (!isDiscordUser(state.session.user)) showGate("wrong-account");
      else if (state.account?.status === "pending") showGate("pending");
      else if (state.account?.status !== "approved" || !clean(state.account?.player_key)) showGate("unlinked");
    }

    applyStaticTranslations();
  }

  if (!window.supabase?.createClient || !supabaseUrl || !supabaseKey) {
    $("gateTitle").textContent = "Fantasy kunde inte startas";
    $("gateText").textContent = "Supabase-inställningarna saknas eller kunde inte laddas.";
    $("discordLogin").hidden = true;
    return;
  }

  const sb = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
      storageKey: "seh-scl27-fantasy-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const state = {
    language: initialLanguage(),
    competitions: [],
    competition: null,
    pool: [],
    leaderboard: [],
    session: null,
    account: null,
    entry: null,
    picks: new Map(),
    savedPicks: new Map(),
    savedScores: new Map(),
    savedBreakdowns: new Map(),
    formerPlayers: [],
    transferState: null,
    insights: null,
    ownership: new Map(),
    activeTab: "team",
    pendingPlacementPlayerId: null,
    pickerSlot: null,
    swapSlot: null
  };

  const DEFAULT_FANTASY_LOGO = "/assets/icons/seh-icon-192.png";
  const DEFAULT_SCL_LOGO = "https://fhr.fra1.cdn.digitaloceanspaces.com/NHLGamer/Community/uploads/monthly_2021_08/large.SCL_logo_shading.png.eb94cae29f362f6a451128a25ebfa3ae.png";
  const LEAGUE_BRANDS = {
    SCL: {
      label: "SCL",
      logo: DEFAULT_SCL_LOGO,
      accent: "#21b8ff",
      accentRgb: "33,184,255"
    },
    ECL: {
      label: "ECL",
      logo: "/Fantasy/assets/leagues/ecl.webp",
      accent: "#d72b2b",
      accentRgb: "215,43,43"
    },
    FCL: {
      label: "FCL",
      logo: "/Fantasy/assets/leagues/fcl.webp?v=20260914-clean2",
      accent: "#e7edf4",
      accentRgb: "231,237,244"
    },
    WECL: {
      label: "WECL",
      logo: "/Fantasy/assets/leagues/wecl.webp?v=20260914-clean2",
      accent: "#00aeea",
      accentRgb: "0,174,234"
    },
    GCL: {
      label: "GCL",
      accent: "#d62828",
      accentRgb: "214,40,40"
    }
  };

  function competitionCode() {
    return clean(state.competition?.code || "SCL2027");
  }

  function leagueCode() {
    return clean(state.competition?.competition_code || "SCL").toUpperCase();
  }

  function seasonLabel() {
    return clean(state.competition?.season_label || state.competition?.name || leagueCode());
  }

  function leagueBrand() {
    const key = leagueCode();
    const fallback = LEAGUE_BRANDS.SCL;
    const base = LEAGUE_BRANDS[key] || {
      label: key || "FANTASY",
      accent: fallback.accent,
      accentRgb: fallback.accentRgb
    };
    const settings = state.competition?.settings || {};
    return {
      ...base,
      hasLeagueLogo: Boolean(clean(settings.brand_logo) || base.logo),
      logo: (() => {
        const configured = clean(settings.brand_logo);
        if (configured === "assets/leagues/ecl.png" || configured === "/Fantasy/assets/leagues/ecl.png") {
          return "/Fantasy/assets/leagues/ecl.webp";
        }
        if (configured === "assets/leagues/fcl.webp" || configured === "/Fantasy/assets/leagues/fcl.webp") {
          return "/Fantasy/assets/leagues/fcl.webp?v=20260914-clean2";
        }
        if (configured === "assets/leagues/wecl.webp" || configured === "/Fantasy/assets/leagues/wecl.webp") {
          return "/Fantasy/assets/leagues/wecl.webp?v=20260914-clean2";
        }
        if (configured.startsWith("assets/")) return "/Fantasy/" + configured;
        return configured || base.logo || DEFAULT_FANTASY_LOGO;
      })(),
      accent: clean(settings.brand_accent) || base.accent || fallback.accent,
      accentRgb: base.accentRgb || fallback.accentRgb
    };
  }

  function nationalityScope() {
    return clean(state.competition?.settings?.nationality_scope || "all").toLowerCase();
  }

  function fantasyCountryAllowed(countryCode) {
    const scope = nationalityScope();
    const code = clean(countryCode).toUpperCase();

    if (scope === "all") return true;
    if (scope === "sweden") return ["SE","SWE","SWEDEN"].includes(code);
    if (scope === "scandinavia") {
      return [
        "SE","SWE","SWEDEN",
        "DK","DNK","DEN","DENMARK",
        "NO","NOR","NORWAY"
      ].includes(code);
    }
    return true;
  }

  function format(value, digits = 0) {
    const locale = state.language === "fi" ? "fi-FI" : state.language === "de" ? "de-DE" : state.language === "en" ? "en-GB" : "sv-SE";
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(number(value));
  }

  function formatDate(value) {
    const raw = clean(value);
    if (!raw) return "–";
    const date = new Date(raw.length === 10 ? raw + "T12:00:00" : raw);
    if (Number.isNaN(date.valueOf())) return raw;
    const locale = state.language === "fi" ? "fi-FI" : state.language === "de" ? "de-DE" : state.language === "en" ? "en-GB" : "sv-SE";
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short"
    }).format(date);
  }

  function setStatus(id, text, tone = "") {
    const el = $(id);
    if (!el) return;
    el.textContent = text || "";
    if (tone) el.dataset.tone = tone;
    else el.removeAttribute("data-tone");
  }

  function formatDeadline(value) {
    const raw = clean(value);
    if (!raw) return "Ej satt";
    const date = new Date(raw);
    if (Number.isNaN(date.valueOf())) return raw;
    const locale = state.language === "fi" ? "fi-FI" : state.language === "de" ? "de-DE" : state.language === "en" ? "en-GB" : "sv-SE";
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Stockholm"
    }).format(date);
  }

  function ownershipFor(playerId) {
    return state.ownership.get(Number(playerId)) || null;
  }

  function ownershipText(playerId) {
    const row = ownershipFor(playerId);
    if (!state.insights?.ownership_visible) return t("owner_after_deadline");
    const owned = row ? format(row.ownership_pct, number(row.ownership_pct) % 1 ? 1 : 0) : "0";
    const captain = row ? format(row.captain_pct, number(row.captain_pct) % 1 ? 1 : 0) : "0";
    return t("owned_by",{owned,captain});
  }

  function differentialMarkup(playerId) {
    const row = ownershipFor(playerId);
    const entries = number(state.insights?.ownership_period?.entries);
    if (!state.insights?.ownership_visible || !row || entries < 10 || number(row.ownership_pct) >= 5) return "";
    return '<span class="fantasy-differential">DIFFERENTIAL</span>';
  }

  function renderPeriodHub() {
    const host = $("periodHub");
    if (!host) return;

    const insights = state.insights || {};
    const period = insights.period || null;
    const entries = number(insights.entries || state.leaderboard.length);
    const ownershipVisible = Boolean(insights.ownership_visible);

    if (!period) {
      $("periodHubEyebrow").textContent = t("preseason");
      $("periodHubName").textContent = t("periods_not_ready");
      $("periodHubWindow").textContent = t("period_info_when_configured");
      $("periodHubMatches").textContent = "0";
      $("periodHubEntries").textContent = String(entries);
      $("periodHubOwnership").textContent = t("after_deadline");
      $("periodHubDeadline").textContent = t("not_set");
      return;
    }

    const status = clean(period.status);
    $("periodHubEyebrow").textContent =
      status === "simulation" ? t("test_season_current_period") :
      status === "live" ? t("live_now") :
      status === "finished" ? t("latest_period") :
      t("next_period");
    $("periodHubName").textContent = clean(period.name) || ("Period " + (period.round_no || "–"));
    const phaseLabels = {
      regular:{sv:"Gruppspel",en:"Group stage",fi:"Lohkovaihe",de:"Gruppenphase"},
      playoffs:{sv:"Slutspel",en:"Playoffs",fi:"Pudotuspelit",de:"Playoffs"},
      finals:{sv:"Final",en:"Final",fi:"Finaali",de:"Finale"},
    };
    const phase = clean(period.phase).toLowerCase();
    const phaseLabel = phaseLabels[phase]?.[state.language] || clean(period.phase) || "SCL";
    $("periodHubWindow").textContent =
      formatDate(period.starts_at) + " – " + formatDate(period.ends_at) +
      " · " + phaseLabel;
    $("periodHubMatches").textContent = String(number(period.matches_played));
    $("periodHubEntries").textContent = String(entries);
    $("periodHubOwnership").textContent = ownershipVisible
      ? (clean(insights.ownership_period?.name) || t("published"))
      : t("after_deadline");
    $("periodHubDeadline").textContent = formatDeadline(period.lock_at);
  }

  function renderTransferStatus() {
    const panel = $("transferPanel");
    if (!panel) return;

    const info = state.transferState;
    const mode = clean(info?.mode || "preseason");
    const unlimited = Boolean(info?.unlimited);
    const target = info?.target_round || null;
    const extraCost = number(info?.extra_transfer_cost || 10);
    const free = number(info?.free_transfers || 0);

    $("transferMode").textContent =
      mode === "preseason"
        ? t("preseason_unlimited")
        : mode === "unlimited"
          ? (clean(target?.name) || t("free_transfer_period"))
          : mode === "round"
            ? (clean(target?.name) || t("upcoming_period"))
            : mode === "closed"
              ? t("transfer_window_closed")
              : t("transfers_disabled");

    $("transferFree").textContent = unlimited ? "∞" : String(free);
    $("transferNext").textContent = unlimited || free > 0 ? "0 P" : "−" + format(extraCost) + " P";
    $("transferDeadline").textContent = target?.lock_at ? formatDeadline(target.lock_at) : t("not_set");

    $("transferDetail").textContent = unlimited
      ? t("preseason_transfer_detail")
      : mode === "round"
        ? t("period_transfer_detail",{cost:format(extraCost)})
        : mode === "closed"
          ? t("no_more_transfer_periods")
          : t("transfer_rules_inactive");
  }

  let rosterToastTimer = null;

  function showRosterError(message) {
    const text = clean(message) || "Det gick inte att göra det valet.";
    setStatus("saveStatus", text, "error");

    const toast = $("fantasyToast");
    if (!toast) return;

    toast.textContent = text;
    toast.dataset.tone = "error";
    toast.classList.add("is-visible");

    if (rosterToastTimer) clearTimeout(rosterToastTimer);
    rosterToastTimer = setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 4200);
  }

  function isDiscordUser(user) {
    if (!user) return false;
    const provider = String(user.app_metadata?.provider || "").toLowerCase();
    if (provider === "discord") return true;
    if ((user.app_metadata?.providers || []).some((item) => String(item).toLowerCase() === "discord")) return true;
    return (user.identities || []).some((identity) => String(identity?.provider || "").toLowerCase() === "discord");
  }

  function competitionOpen() {
    const comp = state.competition;
    if (!comp || comp.status !== "open") return false;

    if (comp.transfers_enabled) {
      const mode = clean(state.transferState?.mode);
      return mode !== "closed" && mode !== "disabled";
    }

    if (!comp.lock_at) return true;
    return new Date(comp.lock_at).getTime() > Date.now();
  }

  function competitionStatusLabel(status) {
    const key = clean(status).toLowerCase();
    const labels = {
      setup: t("setup"),
      open: t("open"),
      locked: t("locked"),
      live: t("live"),
      finished: t("finished"),
      archived: t("archived")
    };
    return labels[key] || clean(status || "UPPSTART").toUpperCase();
  }

  function eligibleSlots(player) {
    const explicit = Array.isArray(player?.eligible_slots)
      ? player.eligible_slots.map((item) => clean(item).toUpperCase()).filter(Boolean)
      : [];

    if (explicit.length) return [...new Set(explicit)];

    const pos = clean(player?.primary_position).toUpperCase();
    if (pos === "F" || pos === "FORWARD") return ["LW", "C", "RW"];
    if (pos === "D" || pos === "DEF" || pos === "BACK") return ["LD", "RD"];
    if (["LW", "C", "RW", "LD", "RD", "G"].includes(pos)) return [pos];
    return [];
  }

  function formatPoints(value) {
    const rounded = Math.round(number(value) * 100) / 100;
    const digits = Number.isInteger(rounded) ? 0 : (Number.isInteger(rounded * 10) ? 1 : 2);
    return format(rounded, digits);
  }

  function breakdownKey(playerId, slot) {
    return Number(playerId) + ":" + clean(slot).toUpperCase();
  }

  function savedPickMatches(slot, pick) {
    const saved = state.savedPicks.get(slot);
    return Boolean(
      saved &&
      pick &&
      Number(saved.player?.id) === Number(pick.player?.id) &&
      Boolean(saved.isCaptain) === Boolean(pick.isCaptain)
    );
  }

  function savedScoreBreakdown(slot, pick) {
    if (!savedPickMatches(slot, pick)) return null;

    const row = state.savedScores.get(Number(pick.player.id));
    const detail = state.savedBreakdowns.get(breakdownKey(pick.player.id, slot)) || null;
    const base = detail ? number(detail.total_points) : number(row?.fantasy_points);
    const multiplier = pick.isCaptain ? number(state.competition?.captain_multiplier || 1) : 1;
    const historyMode = Boolean(detail?.history_mode);
    const total = detail && detail.team_points != null
      ? number(detail.team_points)
      : base * multiplier;

    return {
      base,
      multiplier,
      total,
      games: detail ? number(detail.games) : number(row?.games),
      roundCount: detail ? number(detail.round_count) : 0,
      captainBonus: detail ? number(detail.captain_bonus_points) : Math.max(0, total - base),
      historyMode,
      detail
    };
  }

  function savedScoreMeta(savedScore, pick) {
    if (!savedScore) return "";

    if (savedScore.historyMode) {
      const parts = [];
      parts.push(savedScore.games + " matcher");
      if (savedScore.roundCount > 0) parts.push(savedScore.roundCount + (savedScore.roundCount === 1 ? " period" : " perioder"));
      if (savedScore.captainBonus > 0) parts.push("+" + formatPoints(savedScore.captainBonus) + " kaptensbonus");
      return parts.join(" · ");
    }

    return pick.isCaptain
      ? formatPoints(savedScore.base) + " × " + format(savedScore.multiplier, savedScore.multiplier % 1 ? 1 : 0)
      : savedScore.games + " matcher";
  }

  function scorePill(label, value, points, tone = "") {
    const pointValue = number(points);
    const pointText = pointValue === 0
      ? "0 P"
      : (pointValue > 0 ? "+" : "") + formatPoints(pointValue) + " P";

    return `
      <div class="fantasy-slot__detail-pill${tone ? " fantasy-slot__detail-pill--" + tone : ""}">
        <span>${escapeHtml(label)}</span>
        <strong>${format(value, number(value) % 1 ? 1 : 0)}</strong>
        <em>${pointText}</em>
      </div>
    `;
  }

  function savedStatMarkup(savedScore) {
    const d = savedScore?.detail;
    if (!d) return "";

    const forwardGames = number(d.forward_games);
    const defenseGames = number(d.defense_games);
    const goalieGames = number(d.goalie_games);

    if (goalieGames >= forwardGames && goalieGames >= defenseGames && goalieGames > 0) {
      return [
        scorePill("Vinster", d.goalie_wins, d.win_points, "success"),
        scorePill("Räddn", d.goalie_saves, d.save_points, "ice"),
        scorePill("Nollor", d.goalie_shutouts, d.shutout_points, "ice")
      ].join("");
    }

    if (defenseGames > forwardGames) {
      return [
        scorePill("Mål", d.goals, d.goal_points, "goal"),
        scorePill("Assist", d.assists, d.assist_points, "assist"),
        scorePill("Block", d.blocked_shots, d.block_points, "ice")
      ].join("");
    }

    return [
      scorePill("Mål", d.goals, d.goal_points, "goal"),
      scorePill("Assist", d.assists, d.assist_points, "assist"),
      scorePill("Avg. mål", d.game_winning_goals, d.gwg_points, "success")
    ].join("");
  }

  function draftMatchesSavedRoster() {
    if (!state.entry || state.picks.size !== state.savedPicks.size) return false;

    for (const [slot, pick] of state.picks.entries()) {
      if (!savedPickMatches(slot, pick)) return false;
    }

    return true;
  }

  function countryFlagMarkup(code) {
    const normalized = clean(code).toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalized)) {
      return '<span class="fantasy-country-flag fantasy-country-flag--fallback" aria-label="Okänt land">🌐</span>';
    }

    return '<img class="fantasy-country-flag" src="https://flagcdn.com/24x18/' +
      encodeURIComponent(normalized.toLowerCase()) +
      '.png" data-fantasy-country-flag data-country-code="' +
      escapeHtml(normalized) +
      '" alt="' + escapeHtml(normalized) +
      '" title="' + escapeHtml(normalized) +
      '" width="24" height="18" loading="lazy">';
  }

  function playerPortraitUrls(player) {
    const id = clean(player?.sports_gamer_player_id).replace(/\D/g, "");
    const fallback = "../players/1DEFAULTBILDID.png";
    if (!id) return { src: fallback, original: "", fallback };
    return {
      src: "../web-images/players/" + encodeURIComponent(id + ".png") + ".webp",
      original: "../players/" + encodeURIComponent(id + ".png"),
      fallback
    };
  }

  function portraitMarkup(player, className = "") {
    const urls = playerPortraitUrls(player);
    return '<img class="' + escapeHtml(className) + '" src="' + escapeHtml(urls.src) +
      '" data-fantasy-portrait data-original="' + escapeHtml(urls.original) +
      '" data-default="' + escapeHtml(urls.fallback) +
      '" data-fallback-step="0" alt="' + escapeHtml(player?.display_gamertag || "") + '" loading="lazy">';
  }

  function teamLogoMarkup(player, className = "") {
    const url = clean(player?.team_logo_url);
    if (!url) return "";
    return '<img class="' + escapeHtml(className) + '" src="' + escapeHtml(url) +
      '" data-fantasy-team-logo alt="" loading="lazy">';
  }

  document.addEventListener("error", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;

    if (image.hasAttribute("data-fantasy-portrait")) {
      const step = number(image.dataset.fallbackStep);
      const original = clean(image.dataset.original);
      const fallback = clean(image.dataset.default) || "../players/1DEFAULTBILDID.png";

      if (step === 0 && original) {
        image.dataset.fallbackStep = "1";
        image.src = original;
        return;
      }

      if (step <= 1 && image.src !== new URL(fallback, window.location.href).href) {
        image.dataset.fallbackStep = "2";
        image.src = fallback;
        return;
      }

      image.classList.add("is-default");
      return;
    }

    if (image.hasAttribute("data-fantasy-country-flag")) {
      const code = clean(image.dataset.countryCode).toUpperCase();
      const fallback = document.createElement("span");
      fallback.className = "fantasy-country-flag fantasy-country-flag--text";
      fallback.textContent = code || "🌐";
      fallback.setAttribute("aria-label", code || "Okänt land");
      image.replaceWith(fallback);
      return;
    }

    if (image.hasAttribute("data-fantasy-team-logo")) {
      image.hidden = true;
    }
  }, true);

  function selectedIds() {
    return new Set([...state.picks.values()].map((pick) => Number(pick.player.id)));
  }

  function playerById(id) {
    return state.pool.find((row) => Number(row.id) === Number(id)) || null;
  }

  function usedBudget() {
    return [...state.picks.values()].reduce((sum, pick) => sum + number(pick.player.price), 0);
  }

  function realTeamCount(player) {
    if (player?.real_team_id == null) return 0;
    return [...state.picks.values()].filter(
      (pick) => String(pick.player.real_team_id) === String(player.real_team_id)
    ).length;
  }

  function updateHeaderAccount() {
    const button = $("accountButton");
    if (!button) return;

    if (!state.session?.user) {
      button.textContent = t("login_discord");
      button.dataset.action = "login";
      return;
    }

    const playerName = clean(state.account?.player_name || state.account?.playerName);
    button.textContent = playerName ? playerName : t("logout");
    button.dataset.action = "logout";
  }

  function renderCompetitionSelector() {
    const selector = $("competitionSelect");
    if (!selector) return;

    selector.innerHTML = [
      '<option value="">' + escapeHtml(t("choose_league_option")) + '</option>',
      ...state.competitions.map((row) =>
        '<option value="' + escapeHtml(row.code) + '">' +
          escapeHtml(clean(row.season_label || row.name || row.code)) +
        '</option>'
      )
    ].join("");

    selector.value = state.competition?.code || "";
  }

  function renderNeutralLanding() {
    renderCompetitionSelector();

    document.body.dataset.fantasyLeague = "neutral";
    document.documentElement.style.setProperty("--league-accent", "#35c7ff");
    document.documentElement.style.setProperty("--league-accent-rgb", "53,199,255");
    document.title = "eHockey Fantasy Liga";

    const logoNodes = [$("leagueBrandLogo"), $("heroLeagueLogo"), $("footerLeagueLogo")].filter(Boolean);
    logoNodes.forEach((node) => {
      node.src = DEFAULT_FANTASY_LOGO;
      node.alt = "eHockey Fantasy Liga";
    });

    if ($("leagueBrandSeason")) $("leagueBrandSeason").textContent = "eHOCKEY FANTASY";
    if ($("heroLeagueLab")) $("heroLeagueLab").innerHTML = '<span></span>' + escapeHtml(t("neutral_hero_kicker"));
    if ($("heroTitleLead")) $("heroTitleLead").textContent = t("neutral_hero_first");
    if ($("heroLeagueSix")) $("heroLeagueSix").textContent = t("neutral_hero_second");
    if ($("heroLead")) $("heroLead").textContent = t("neutral_hero_lead");
    if ($("heroBuildButton")) $("heroBuildButton").textContent = t("neutral_choose_league");

    const ruleButton = document.querySelector("[data-jump-rules]");
    if (ruleButton) ruleButton.hidden = true;
    const badges = document.querySelector(".fantasy-hero__badges");
    if (badges) badges.hidden = true;
    const scoreboard = document.querySelector(".fantasy-scoreboard");
    if (scoreboard) scoreboard.hidden = true;
    const commandbar = document.querySelector(".fantasy-commandbar");
    if (commandbar) commandbar.hidden = true;
    if ($("periodHub")) $("periodHub").hidden = true;
    const tabs = document.querySelector(".fantasy-tabs");
    if (tabs) tabs.hidden = true;
    $$("[data-panel]").forEach((panel) => { panel.hidden = true; });

    const hero = document.querySelector(".fantasy-hero");
    if (hero) hero.classList.remove("fantasy-hero--no-logo");
    const heroIdentity = document.querySelector(".fantasy-hero__identity");
    if (heroIdentity) heroIdentity.hidden = false;

    const betaRibbon = document.querySelector(".beta-ribbon");
    if (betaRibbon) betaRibbon.hidden = true;
  }

  function renderCompetitionBranding() {
    const comp = state.competition;
    if (!comp) {
      renderNeutralLanding();
      return;
    }

    const brand = leagueBrand();
    const league = brand.label || leagueCode();
    const season = seasonLabel();
    const settings = comp.settings || {};
    const betaSource = clean(settings.beta_source);
    const setupMessage = clean(settings.setup_message);
    const scope = nationalityScope();
    const scopeText =
      scope === "sweden" ? ({sv:"svenska spelare",en:"Swedish players",fi:"ruotsalaiset pelaajat",de:"schwedische Spieler"}[state.language]) :
      scope === "scandinavia" ? ({sv:"skandinaviska spelare",en:"Scandinavian players",fi:"skandinaaviset pelaajat",de:"skandinavische Spieler"}[state.language]) :
      ({sv:"alla spelare",en:"all players",fi:"kaikki pelaajat",de:"alle Spieler"}[state.language]);

    document.body.dataset.fantasyLeague = league.toLowerCase();
    document.documentElement.style.setProperty("--league-accent", brand.accent);
    document.documentElement.style.setProperty("--league-accent-rgb", brand.accentRgb);
    document.title = season + " Fantasy" + (settings.beta_mode ? " Beta" : "");

    renderCompetitionSelector();

    const ruleButton = document.querySelector("[data-jump-rules]");
    if (ruleButton) ruleButton.hidden = false;
    const badges = document.querySelector(".fantasy-hero__badges");
    if (badges) badges.hidden = false;
    const scoreboard = document.querySelector(".fantasy-scoreboard");
    if (scoreboard) scoreboard.hidden = false;
    const commandbar = document.querySelector(".fantasy-commandbar");
    if (commandbar) commandbar.hidden = false;
    if ($("periodHub")) $("periodHub").hidden = false;
    const tabs = document.querySelector(".fantasy-tabs");
    if (tabs) tabs.hidden = false;
    $$("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== state.activeTab;
    });

    if ($("heroTitleLead")) $("heroTitleLead").textContent =
      state.language === "en" ? "BUILD YOUR" :
      state.language === "fi" ? "RAKENNA" :
      state.language === "de" ? "BAUE DEINE" :
      "BYGG DIN";

    const logoNodes = [$("leagueBrandLogo"), $("heroLeagueLogo"), $("footerLeagueLogo")].filter(Boolean);
    logoNodes.forEach((node) => {
      node.src = brand.logo;
      node.alt = league;
    });

    const hero = document.querySelector(".fantasy-hero");
    if (hero) hero.classList.toggle("fantasy-hero--no-logo", !brand.hasLeagueLogo);
    const heroIdentity = document.querySelector(".fantasy-hero__identity");
    if (heroIdentity) heroIdentity.hidden = !brand.hasLeagueLogo;

    if ($("leagueBrandSeason")) $("leagueBrandSeason").textContent = "eHOCKEY FANTASY";
    if ($("heroLeagueLab")) $("heroLeagueLab").innerHTML = '<span></span>' + escapeHtml(league + " FANTASY");
    if ($("heroLeagueSix")) $("heroLeagueSix").textContent = t("build_six_short",{league});
    if ($("heroBuildButton")) $("heroBuildButton").textContent = t("build_your_six",{league});
    if ($("scoreboardLeagueTitle")) $("scoreboardLeagueTitle").textContent = season + " FANTASY";
    if ($("footerCompetitionLabel")) $("footerCompetitionLabel").textContent = season + " Fantasy";

    const intro = comp.status === "setup"
      ? (state.language === "sv" && setupMessage ? setupMessage : t("setup_intro",{season}))
      : betaSource
        ? t("beta_intro",{source:betaSource})
        : t("normal_intro");
    if ($("heroLead")) $("heroLead").textContent = intro;

    if ($("betaRibbonTitle")) {
      $("betaRibbonTitle").textContent = betaSource ? "BETAPOOL: " + betaSource.toUpperCase() : season.toUpperCase() + " FANTASY";
    }
    if ($("betaRibbonText")) {
      $("betaRibbonText").textContent = comp.status === "setup"
        ? (state.language === "sv" && setupMessage ? setupMessage : t("fantasy_preparing"))
        : t("player_selection",{scope:scopeText});
    }
    if ($("scoreboardSource")) {
      $("scoreboardSource").textContent = betaSource
        ? betaSource.toUpperCase()
        : (comp.status === "setup" ? t("pool_not_published_upper") : scopeText.toUpperCase());
    }
    if ($("scoreboardBetaTag")) $("scoreboardBetaTag").hidden = settings.beta_mode === false;
    if ($("scoreboardSourceLabel")) {
      const sourceLabelKey = betaSource ? "beta_source_upper" : "selection_upper";
      $("scoreboardSourceLabel").dataset.i18n = sourceLabelKey;
      $("scoreboardSourceLabel").textContent = t(sourceLabelKey);
    }
    if ($("commandMode")) {
      $("commandMode").textContent =
        season.toUpperCase() + " / " +
        (comp.status === "setup" ? t("under_construction_upper") :
          comp.status === "open" ? t("team_building_open_upper") :
          competitionStatusLabel(comp.status));
    }
    if ($("commandPoolCount")) $("commandPoolCount").textContent = t("players_count",{count:state.pool.length});

    if ($("setupBannerTitle")) $("setupBannerTitle").textContent = t("season_under_construction",{season});
    if ($("setupBannerText")) {
      $("setupBannerText").textContent =
        (state.language === "sv" && setupMessage)
          ? setupMessage
          : (state.pool.length ? t("pool_available") : t("pool_not_published"));
    }
    if ($("marketSourceLabel")) {
      $("marketSourceLabel").textContent = betaSource
        ? betaSource.toUpperCase()
        : (comp.status === "setup" ? t("waiting_for_pool_upper") : season.toUpperCase());
    }
    if ($("playersKicker")) $("playersKicker").textContent = t("fantasy_players_kicker",{season:season.toUpperCase()});
    if ($("playersIntro")) {
      $("playersIntro").textContent = comp.status === "setup"
        ? (state.language === "sv" && setupMessage ? setupMessage : t("pool_published_later"))
        : t("eligible_players_intro",{season});
    }
    if ($("leaderboardTitle")) $("leaderboardTitle").textContent = season + " Fantasy";
    if ($("leaderboardIntro")) {
      $("leaderboardIntro").textContent = comp.status === "setup"
        ? t("leaderboard_opens",{season})
        : t("leaderboard_updates");
    }
    if ($("rulesTitle")) $("rulesTitle").textContent = t("how_it_works",{league});
    if ($("rulesIntro")) {
      $("rulesIntro").textContent = comp.status === "setup"
        ? t("rules_setup_intro",{season})
        : t("rules_live_intro",{league});
    }
    if ($("ruleBudgetTitle")) $("ruleBudgetTitle").textContent = format(comp.budget || 0) + " CR";
    if ($("ruleBudgetText")) $("ruleBudgetText").textContent =
      t("budget_rule",{budget:format(comp.budget || 0)});
    if ($("ruleTeamLimitTitle")) $("ruleTeamLimitTitle").textContent =
      t("max_team_rule_title",{max:format(comp.max_players_per_real_team || 2)});
    if ($("ruleTeamLimitText")) $("ruleTeamLimitText").textContent =
      t("max_team_rule",{max:format(comp.max_players_per_real_team || 2)});
    if ($("ruleCaptainTitle")) $("ruleCaptainTitle").textContent =
      t("captain_rule_title",{multiplier:format(comp.captain_multiplier || 1, 1)});
    if ($("ruleCaptainText")) $("ruleCaptainText").textContent =
      t("captain_rule",{percent:format((number(comp.captain_multiplier || 1) - 1) * 100)});

    const divisionBlock = $("divisionFactorBlock");
    if (divisionBlock) divisionBlock.hidden = league !== "ECL";
    const gclFactorBlock = $("gclFactorBlock");
    if (gclFactorBlock) gclFactorBlock.hidden = league !== "GCL";

    if ($("periodRulesText")) {
      $("periodRulesText").textContent = comp.status === "setup"
        ? t("setup_period_rules",{season})
        : league === "SCL"
          ? t("scl_period_rules")
          : t("generic_period_rules");
    }

    const betaRibbon = document.querySelector(".beta-ribbon");
    if (betaRibbon) betaRibbon.hidden = settings.beta_mode === false;

    const brandLink = $("leagueBrandLink");
    if (brandLink) brandLink.setAttribute("aria-label", season + " Fantasy");
  }

  function renderHero() {
    const comp = state.competition;
    renderCompetitionBranding();
    $("heroStart").textContent = comp?.starts_on ? formatDate(comp.starts_on).toUpperCase() : t("not_set").toUpperCase();
    $("heroStatus").textContent = competitionStatusLabel(comp?.status || "setup");
    $("heroBudget").textContent = format(comp?.budget || 100);
    $("heroEntries").textContent = String(state.leaderboard.length || 0);
  }

  function showGate(kind, message = "") {
    $("accountGate").hidden = false;
    $("builder").hidden = true;
    $("discordLogin").hidden = false;
    $("connectProfile").hidden = true;
    setStatus("gateStatus", "");

    let title = t("login_to_build");
    let text = message || t("account_required_text");

    if (kind === "loading") {
      title = t("checking_account");
      text = t("checking_discord");
      $("discordLogin").hidden = true;
    } else if (kind === "pending") {
      title = t("link_pending");
      text = message || t("link_pending_text");
      $("discordLogin").hidden = true;
    } else if (kind === "unlinked") {
      title = t("link_profile_first");
      text = message || t("link_profile_text");
      $("discordLogin").hidden = true;
      $("connectProfile").hidden = false;
    } else if (kind === "wrong-account") {
      title = t("discord_only");
      text = message || t("discord_only_text");
    }

    $("gateTitle").textContent = title;
    $("gateText").textContent = text;
  }

  function showBuilder() {
    $("accountGate").hidden = true;
    $("builder").hidden = false;

    const open = competitionOpen();
    const hasPool = state.pool.length > 0;

    $("setupBanner").hidden = open && hasPool;
    $("saveTeam").disabled = !(open && hasPool);
    $("linkedPlayer").textContent = clean(state.account?.player_name) || t("linked_player");

    if (!hasPool) {
      setStatus("saveStatus", seasonLabel() + " · " + t("pool_not_published"));
    } else if (!open) {
      setStatus("saveStatus", t("team_building_not_open"));
    } else {
      setStatus("saveStatus", "");
    }
  }

  function renderLineup() {
    const budget = number(state.competition?.budget || 100);
    const used = usedBudget();
    const captainId = [...state.picks.values()].find((pick) => pick.isCaptain)?.player?.id || null;
    const saveButton = $("saveTeam");
    const unavailableSlots = new Set(
      [...state.picks.entries()]
        .filter(([, pick]) => pick.player?.is_available === false)
        .map(([slot]) => slot)
    );
    const invalidSlots = new Set(
      [...state.picks.entries()]
        .filter(([slot, pick]) => pick.player?.is_available === false || !eligibleSlots(pick.player).includes(slot))
        .map(([slot]) => slot)
    );
    const savedRosterIsCurrent = draftMatchesSavedRoster() && invalidSlots.size === 0;

    $("selectedCount").textContent = state.picks.size + " / 6";
    $("budgetUsed").textContent = format(used);
    $("budgetLeft").textContent = format(budget - used);
    $("budgetLeft").classList.toggle("over-budget", used > budget);

    if ($("teamPoints")) {
      $("teamPoints").textContent = state.entry ? formatPoints(state.entry.total_points) + " P" : "–";
      $("teamPoints").classList.toggle("is-stale", Boolean(state.entry) && !savedRosterIsCurrent);
    }
    if ($("teamPointsLabel")) {
      $("teamPointsLabel").textContent = state.entry && !savedRosterIsCurrent
        ? t("saved_points",{league:leagueCode()})
        : t("league_points",{league:leagueCode()});
    }

    if (saveButton) {
      const complete = state.picks.size === 6;
      const hasCaptain = Boolean(captainId);
      const withinBudget = used <= budget;
      const savedAndUnchanged = Boolean(state.entry) && savedRosterIsCurrent;
      const canSave =
        competitionOpen() &&
        complete &&
        hasCaptain &&
        withinBudget &&
        invalidSlots.size === 0 &&
        !savedAndUnchanged;

      saveButton.disabled = !canSave;
      saveButton.classList.toggle("is-saved", savedAndUnchanged);
      saveButton.textContent = unavailableSlots.size > 0
        ? t("replace_unavailable")
        : invalidSlots.size > 0
          ? t("replace_invalid")
        : !complete
          ? t("choose_six")
          : !hasCaptain
            ? t("choose_captain")
            : !withinBudget
              ? t("over_budget")
              : savedAndUnchanged
                ? t("team_saved",{league:leagueCode()})
                : state.entry
                  ? t("update_team",{league:leagueCode()})
                  : t("save_league_team",{league:leagueCode()});
    }

    $$(".fantasy-slot").forEach((slotEl) => {
      const slot = slotEl.dataset.slot;
      const pick = state.picks.get(slot);

      if (!pick) {
        slotEl.classList.remove("is-filled", "is-captain-card", "is-invalid-slot");
        const count = state.pool.filter((player) =>
          player.is_available !== false &&
          !selectedIds().has(Number(player.id)) &&
          eligibleSlots(player).includes(slot)
        ).length;

        slotEl.innerHTML =
          '<span class="fantasy-slot__position">' + slot + '</span>' +
          '<button type="button" class="fantasy-slot__empty" data-open-slot="' + slot + '">' +
            '<strong>' + escapeHtml(t("choose_slot",{slot})) + '</strong>' +
            '<small>' + escapeHtml(t("eligible_count",{count})) + '</small>' +
          '</button>';
        return;
      }

      const player = pick.player;
      const captain = Number(captainId) === Number(player.id);
      const invalidSlot = invalidSlots.has(slot);
      const unavailable = unavailableSlots.has(slot);
      const flag = countryFlagMarkup(player.country_code);
      const savedScore = savedScoreBreakdown(slot, pick);
      const scoreMarkup = savedScore && savedScore.games > 0
        ? `<div class="fantasy-slot__score">
            <div class="fantasy-slot__score-head">
              <span>${escapeHtml(seasonLabel())}</span>
              <strong>${formatPoints(savedScore.total)} P</strong>
            </div>
            <small>${escapeHtml(savedScoreMeta(savedScore, pick))}</small>
          </div>
          <div class="fantasy-slot__details">${savedStatMarkup(savedScore)}</div>`
        : (state.entry
          ? '<div class="fantasy-slot__score fantasy-slot__score--pending"><span>' + escapeHtml(seasonLabel()) + '</span><small>${escapeHtml(t("awaiting_real_matches"))}</small></div>'
          : "");

      slotEl.classList.add("is-filled");
      slotEl.classList.toggle("is-captain-card", captain);
      slotEl.classList.toggle("is-invalid-slot", invalidSlot);
      slotEl.classList.toggle("is-unavailable-player", unavailable);

      slotEl.innerHTML = `
        <div class="fantasy-slot__player fantasy-slot__player--club">
          <div class="fantasy-slot__club-stripe" aria-hidden="true"></div>
          ${teamLogoMarkup(player, "fantasy-slot__club-watermark")}
          <div class="fantasy-slot__visual">
            <div class="fantasy-slot__portrait-wrap fantasy-slot__portrait-wrap--club">
              ${portraitMarkup(player, "fantasy-slot__portrait")}
            </div>
            <div class="fantasy-slot__identity">
              <strong class="fantasy-player-name-line">${flag}<span class="fantasy-player-name">${escapeHtml(clean(player.display_gamertag) || t("unknown"))}</span></strong>
              <small class="fantasy-slot__team fantasy-slot__club-row">
                <span class="fantasy-slot__club-logo">
                  ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--slot")}
                </span>
                <span class="fantasy-slot__club-copy">
                  <b>${escapeHtml(clean(player.real_team_name) || t("team_not_ready"))}</b>
                  <em>${escapeHtml(t("club_upper"))}</em>
                </span>
              </small>
              <small class="fantasy-slot__meta">${escapeHtml(eligibleSlots(player).join(" / "))} · ${format(player.price)} CR</small>
              ${unavailable
                ? '<small class="fantasy-slot__invalid-note">' + escapeHtml(t("unavailable_player")) + '</small>'
                : invalidSlot
                  ? '<small class="fantasy-slot__invalid-note">' + escapeHtml(t("invalid_slot",{slot})) + '</small>'
                  : ""}
            </div>
          </div>
          ${scoreMarkup}
          <div class="fantasy-slot__actions">
            <button type="button" data-captain="${player.id}" class="${captain ? "is-captain" : ""}">
              ${captain ? escapeHtml(t("captain_upper_action")) : escapeHtml(t("make_captain"))}
            </button>
            <button type="button" data-swap="${slot}">${escapeHtml(t("swap"))}</button>
          </div>
        </div>
      `;
    });
  }

  function filteredPlayers(searchId, positionId) {
    const query = clean($(searchId)?.value).toLocaleLowerCase("sv-SE");
    const position = clean($(positionId)?.value || "all").toUpperCase();

    return state.pool
      .filter((player) => player.is_available !== false)
      .filter((player) => {
        if (position !== "ALL" && !eligibleSlots(player).includes(position)) return false;
        if (!query) return true;

        return [
          player.display_gamertag,
          player.real_team_name,
          player.primary_position
        ].join(" ").toLocaleLowerCase("sv-SE").includes(query);
      })
      .sort((a, b) =>
        number(b.price) - number(a.price) ||
        clean(a.display_gamertag).localeCompare(clean(b.display_gamertag), "sv")
      );
  }

  function renderFormerPlayers() {
    const section = $("formerPlayersSection");
    const host = $("formerPlayersList");
    if (!section || !host) return;

    const rows = Array.isArray(state.formerPlayers)
      ? [...state.formerPlayers].sort((a, b) =>
          number(b.last_round_no) - number(a.last_round_no) ||
          clean(a.slot).localeCompare(clean(b.slot), "sv")
        )
      : [];

    if (!state.entry || !rows.length) {
      section.hidden = true;
      host.innerHTML = "";
      return;
    }

    section.hidden = false;
    host.innerHTML = rows.map((row) => {
      const player = playerById(row.pool_player_id);
      const name = clean(player?.display_gamertag) || "Okänd spelare";
      const team = clean(player?.real_team_name) || t("team_not_ready");
      const slot = clean(row.slot).toUpperCase() || "–";
      const rounds = Array.isArray(row.round_breakdown) ? row.round_breakdown : [];
      const roundMarkup = rounds.map((round) => {
        const label = clean(round.round_name) || ("Period " + (round.round_no || "–"));
        return '<span class="fantasy-former-player__round">' +
          escapeHtml(label) + ': <strong>' + formatPoints(round.team_points) + ' P</strong>' +
          (round.is_captain ? '<em>K</em>' : '') +
        '</span>';
      }).join("");

      return [
        '<article class="fantasy-former-player">',
          '<div class="fantasy-former-player__portrait-wrap">',
            player ? portraitMarkup(player, "fantasy-former-player__portrait") : "",
            player ? teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--former") : "",
          '</div>',
          '<div class="fantasy-former-player__main">',
            '<strong class="fantasy-player-name-line">',
              player ? countryFlagMarkup(player.country_code) : "",
              '<span class="fantasy-player-name">' + escapeHtml(name) + '</span>',
            '</strong>',
            '<small>' + escapeHtml(team) + ' · ' + escapeHtml(slot) + ' · ' + number(row.games) + ' matcher</small>',
            '<div class="fantasy-former-player__rounds">',
              roundMarkup || '<span class="fantasy-former-player__round">Ingen matchpoäng registrerad</span>',
            '</div>',
          '</div>',
          '<div class="fantasy-former-player__points">',
            '<span>BIDRAG TILL LAGET</span>',
            '<strong>' + formatPoints(row.team_points) + ' P</strong>',
            '<small>' + (number(row.captain_bonus_points) > 0
              ? "+" + formatPoints(row.captain_bonus_points) + " P kaptensbonus"
              : "Poängen ligger kvar i totalen") + '</small>',
          '</div>',
        '</article>'
      ].join("");
    }).join("");
  }

  function renderMarket() {
    const host = $("marketList");
    if (!host) return;

    if (!state.pool.length) {
      host.innerHTML = '<div class="fantasy-empty">Spelarpoolen är inte publicerad ännu.</div>';
      return;
    }

    const selected = selectedIds();
    const rows = filteredPlayers("marketSearch", "marketPosition");

    host.innerHTML = rows.map((player) => {
      const alreadySelected = selected.has(Number(player.id));
      const slots = eligibleSlots(player).join("/") || clean(player.primary_position) || "–";

      return `
        <article class="fantasy-player-row">
          <div class="fantasy-player-row__portrait-wrap">
            ${portraitMarkup(player, "fantasy-player-row__portrait")}
            ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--market")}
          </div>
          <div class="fantasy-player-row__main">
            <strong class="fantasy-player-name-line">${countryFlagMarkup(player.country_code)}<span class="fantasy-player-name">${escapeHtml(player.display_gamertag)}</span></strong>
            <small>
              ${escapeHtml(clean(player.real_team_name) || t("team_not_ready"))} ·
              ${escapeHtml(slots)}
            </small>
            <small class="fantasy-player-row__ownership">${escapeHtml(ownershipText(player.id))}</small>
            <button class="fantasy-inline-player-link" type="button" data-player-detail="${player.id}">${escapeHtml(t("form_info"))}</button>
          </div>
          <div class="fantasy-player-row__price">
            <b>${format(player.price)}</b>
            <span>CR</span>
          </div>
          <button type="button" data-add="${player.id}" ${alreadySelected || !competitionOpen() ? "disabled" : ""}>
            ${alreadySelected
              ? t("selected")
              : eligibleSlots(player).length > 1
                ? t("choose_position")
                : t("add")}
          </button>
        </article>
      `;
    }).join("") || '<div class="fantasy-empty">' + escapeHtml(t("no_players_match")) + '</div>';
  }

  function renderPlayers() {
    const host = $("playersGrid");
    if (!host) return;

    if (!state.pool.length) {
      host.innerHTML = '<div class="fantasy-empty">' + escapeHtml(seasonLabel() + " · " + t("no_pool")) + '</div>';
      return;
    }

    const rows = filteredPlayers("playersSearch", "playersPosition");

    host.innerHTML = rows.map((player) => `
      <article class="fantasy-player-card">
        <div class="fantasy-player-card__visual">
          ${portraitMarkup(player, "fantasy-player-card__portrait")}
          <div class="fantasy-player-card__identity">
            <div class="fantasy-player-card__top">
              <span>${escapeHtml(eligibleSlots(player).join("/") || clean(player.primary_position) || "–")}</span>
              <b>${format(player.price)} CR</b>
            </div>
            <h3 class="fantasy-player-name-line">${countryFlagMarkup(player.country_code)}<span class="fantasy-player-name">${escapeHtml(player.display_gamertag)}</span></h3>
            <p>
              ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--card")}
              <span>${escapeHtml(clean(player.real_team_name) || t("team_not_ready"))}</span>
            </p>
            ${differentialMarkup(player.id)}
          </div>
        </div>
        <footer>
          <span>${escapeHtml(ownershipText(player.id))}</span>
          <span>${escapeHtml(eligibleSlots(player).join(" / "))}</span>
        </footer>
        <button class="fantasy-player-card__detail" type="button" data-player-detail="${player.id}">${escapeHtml(t("show_form_stats"))}</button>
      </article>
    `).join("") || '<div class="fantasy-empty">Inga spelare matchar filtret.</div>';
  }

  function playerDetailStat(label, value, suffix = "") {
    return '<div class="fantasy-player-detail__stat"><span>' + escapeHtml(label) +
      '</span><strong>' + escapeHtml(value) + escapeHtml(suffix) + '</strong></div>';
  }

  function renderPlayerDetail(data) {
    const host = $("playerDetailContent");
    if (!host) return;

    if (!data?.ok) {
      host.innerHTML = '<div class="fantasy-empty">' + escapeHtml(t("no_player_info")) + '</div>';
      return;
    }

    const player = data.player || {};
    const totals = data.totals || {};
    const ownership = data.ownership || null;
    const recent = Array.isArray(data.recent_matches) ? data.recent_matches : [];
    const games = number(totals.games);
    const totalPoints = number(totals.fantasy_points);
    const slots = Array.isArray(player.eligible_slots) ? player.eligible_slots.join(" / ") : clean(player.primary_position);

    const ownershipValue = data.ownership_visible
      ? format(ownership?.ownership_pct || 0, number(ownership?.ownership_pct) % 1 ? 1 : 0) + " %"
      : t("after_deadline");
    const captainValue = data.ownership_visible
      ? format(ownership?.captain_pct || 0, number(ownership?.captain_pct) % 1 ? 1 : 0) + " %"
      : "–";

    const recentMarkup = recent.length
      ? recent.map((match) => {
          const factor = number(match.league_multiplier || 1);
          const factorText = Math.abs(factor - 1) > 0.001
            ? '<em>×' + escapeHtml(format(factor, 2)) + '</em>'
            : "";
          const date = match.started_at ? formatDate(match.started_at) : t("match_singular");
          return '<div class="fantasy-player-form-row">' +
            '<span><b>' + escapeHtml(date) + '</b><small>' +
              escapeHtml(clean(match.played_position || match.scoring_role) || "–") +
              ' · ' + escapeHtml(t("league_lower")) + ' ' + escapeHtml(match.source_league_id || "–") +
            '</small></span>' +
            '<span class="fantasy-player-form-row__factor">' + factorText + '</span>' +
            '<strong>' + formatPoints(match.fantasy_points) + ' P</strong>' +
          '</div>';
        }).join("")
      : '<div class="fantasy-player-detail__empty">' + escapeHtml(t("no_matches")) + '</div>';

    const hasGoalieGames = number(totals.goalie_games) > 0;
    const hasSkaterGames = number(totals.forward_games) + number(totals.defense_games) > 0;
    const statPieces = [];
    if (hasSkaterGames || !games) {
      statPieces.push(playerDetailStat(t("goals"), format(totals.goals || 0)));
      statPieces.push(playerDetailStat(t("assists"), format(totals.assists || 0)));
      statPieces.push(playerDetailStat(t("blocks"), format(totals.blocked_shots || 0)));
    }
    if (hasGoalieGames) {
      statPieces.push(playerDetailStat(t("goalie_wins"), format(totals.goalie_wins || 0)));
      statPieces.push(playerDetailStat(t("saves"), format(totals.goalie_saves || 0)));
      statPieces.push(playerDetailStat(t("shutouts"), format(totals.goalie_shutouts || 0)));
    }

    host.innerHTML = `
      <div class="fantasy-player-detail__hero">
        <div class="fantasy-player-detail__portrait-wrap">
          ${portraitMarkup(player, "fantasy-player-detail__portrait")}
          ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--detail")}
        </div>
        <div class="fantasy-player-detail__identity">
          <p class="fantasy-kicker">${escapeHtml(t("player_profile_upper"))}</p>
          <h2 class="fantasy-player-name-line">${countryFlagMarkup(player.country_code)}<span class="fantasy-player-name">${escapeHtml(clean(player.display_gamertag) || t("unknown"))}</span></h2>
          <p>${escapeHtml(clean(player.real_team_name) || t("team_not_ready"))} · ${escapeHtml(slots || "–")}</p>
          <div class="fantasy-player-detail__tags">
            <span>${format(player.price)} CR</span>
            ${data.ownership_visible && number(ownership?.ownership_pct) < 5 && number(ownership?.entries) >= 10
              ? '<span class="is-differential">DIFFERENTIAL</span>'
              : ""}
          </div>
        </div>
      </div>

      <div class="fantasy-player-detail__metrics">
        ${playerDetailStat(t("fantasy_points_label"), formatPoints(totalPoints) + " P")}
        ${playerDetailStat(t("matches"), format(games))}
        ${playerDetailStat(t("points_per_match"), format(totals.points_per_game || 0, 2))}
        ${playerDetailStat(t("owned"), ownershipValue)}
        ${playerDetailStat(t("captain"), captainValue)}
      </div>

      <section class="fantasy-player-detail__section">
        <div class="fantasy-player-detail__section-head">
          <span>${escapeHtml(t("form"))}</span>
          <h3>${escapeHtml(t("last_5_matches"))}</h3>
        </div>
        <div class="fantasy-player-form">${recentMarkup}</div>
      </section>

      <section class="fantasy-player-detail__section">
        <div class="fantasy-player-detail__section-head">
          <span>${escapeHtml(t("outcome"))}</span>
          <h3>${escapeHtml(t("registered_stats"))}</h3>
        </div>
        <div class="fantasy-player-detail__stats">${statPieces.join("")}</div>
        ${data.ownership_visible
          ? '<p class="fantasy-player-detail__note">' +
              escapeHtml(t("ownership_from",{
                period:clean(ownership?.period_name) || t("ownership_period_default"),
                entries:format(ownership?.entries || 0)
              })) + '</p>'
          : '<p class="fantasy-player-detail__note">' + escapeHtml(t("ownership_after_note")) + '</p>'}
      </section>
    `;
  }

  async function openPlayerDetail(playerId) {
    const dialog = $("playerDetailDialog");
    const host = $("playerDetailContent");
    if (!dialog || !host) return;

    const player = playerById(playerId);
    host.innerHTML = '<div class="fantasy-player-detail__loading">' +
      (player ? escapeHtml(player.display_gamertag) + ' · ' : '') +
      escapeHtml(t("loading_form")) + '</div>';
    dialog.showModal();

    try {
      const { data, error } = await sb.rpc("seh_fantasy_public_player_detail", {
        p_pool_player_id: Number(playerId),
        p_code: competitionCode()
      });
      if (error) throw error;
      renderPlayerDetail(Array.isArray(data) ? data[0] : data);
    } catch (error) {
      host.innerHTML = '<div class="fantasy-empty">' + escapeHtml(t("could_not_load_player")) + ': ' +
        escapeHtml(error?.message || String(error)) + '</div>';
    }
  }

  function renderLeaderboard() {
    const host = $("leaderboard");
    if (!host) return;

    if (!state.leaderboard.length) {
      host.innerHTML = '<div class="fantasy-empty">' + escapeHtml(t("leaderboard_empty")) + '</div>';
      return;
    }

    const rows = [...state.leaderboard].sort((a, b) =>
      number(b.total_points) - number(a.total_points) ||
      number(a.entry_id) - number(b.entry_id)
    );

    host.innerHTML = rows.map((row, index) => `
      <button class="fantasy-leaderboard-row fantasy-leaderboard-row--clickable" type="button" data-view-entry="${row.entry_id}">
        <span>#${row.current_rank || index + 1}</span>
        <strong>${escapeHtml(row.team_name || t("unnamed_team"))}</strong>
        <b>${format(row.total_points, number(row.total_points) % 1 ? 1 : 0)} P</b>
        <em>${escapeHtml(t("show_team"))}</em>
      </button>
    `).join("");
  }

  function publicRosterMeta(player) {
    const team = clean(player?.real_team_name) || t("team_not_ready");
    const totalGames = number(player?.total_games ?? player?.games);
    const slots = Array.isArray(player?.eligible_slots)
      ? player.eligible_slots.map((slot) => clean(slot).toUpperCase()).filter(Boolean)
      : [];
    const hybrid = slots.includes("G") && slots.some((slot) => slot !== "G");

    if (!hybrid) {
      return team + " · " + totalGames + " matcher totalt";
    }

    const fantasySlot = clean(player?.slot).toUpperCase();
    const countedGames = fantasySlot === "G"
      ? number(player?.goalie_games)
      : number(player?.skater_games);
    const countedLabel = fantasySlot === "G"
      ? "målvaktsmatcher räknas"
      : "utespelarmatcher räknas";

    return team + " · " + totalGames + " matcher totalt · " + countedGames + " " + countedLabel;
  }

  function publicRosterPlayerMarkup(player) {
    const captain = Boolean(player?.is_captain);
    const contribution = number(player?.team_points);
    const captainBonus = number(player?.captain_bonus_points);

    return `
      <article class="fantasy-public-roster-player${captain ? " is-captain" : ""}">
        <div class="fantasy-public-roster-player__portrait-wrap">
          ${portraitMarkup(player, "fantasy-public-roster-player__portrait")}
          ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--public-roster")}
        </div>
        <div class="fantasy-public-roster-player__main">
          <div class="fantasy-public-roster-player__name">
            <span class="fantasy-public-roster-player__slot">${escapeHtml(clean(player?.slot || "–"))}</span>
            <strong class="fantasy-player-name-line">
              ${countryFlagMarkup(player?.country_code)}
              <span class="fantasy-player-name">${escapeHtml(clean(player?.display_gamertag) || t("unknown"))}</span>
            </strong>
            ${captain ? '<span class="fantasy-public-roster-player__captain">KAPTEN</span>' : ""}
          </div>
          <small>${escapeHtml(publicRosterMeta(player))}</small>
          ${captainBonus > 0
            ? '<small class="fantasy-public-roster-player__bonus">+' + formatPoints(captainBonus) + ' P kaptensbonus</small>'
            : ""}
        </div>
        <div class="fantasy-public-roster-player__points">
          <span>BIDRAG</span>
          <strong>${formatPoints(contribution)} P</strong>
        </div>
      </article>
    `;
  }

  function renderPublicEntry(data) {
    const content = $("publicEntryContent");
    if (!content) return;

    if (!data?.visible) {
      content.innerHTML = `
        <div class="fantasy-public-entry__locked">
          <span>🔒</span>
          <h3>Laget är dolt</h3>
          <p>${escapeHtml(clean(data?.message) || "Laget blir synligt efter deadline.")}</p>
        </div>
      `;
      return;
    }

    const entry = data.entry || {};
    const round = data.round || null;
    const roster = Array.isArray(data.roster) ? data.roster : [];
    const former = Array.isArray(data.former_players) ? data.former_players : [];
    const penalty = number(data.transfer_penalty_points);
    const roundLabel = round
      ? (clean(round.name) || ("Period " + (round.round_no || "–")))
      : "Låst lag";

    content.innerHTML = `
      <div class="fantasy-public-entry__hero">
        <div>
          <span>LÅST FANTASY-LAG · ${escapeHtml(roundLabel.toUpperCase())}</span>
          <h2>${escapeHtml(clean(entry.team_name) || "Namnlöst lag")}</h2>
          <small>Det här är den senast låsta uppställningen. Kommande byten visas inte före nästa deadline.</small>
        </div>
        <div class="fantasy-public-entry__total">
          <span>TOTALT</span>
          <strong>${formatPoints(entry.total_points)} P</strong>
          ${penalty > 0 ? '<small>−' + formatPoints(penalty) + ' P bytesavdrag</small>' : ""}
        </div>
      </div>

      <div class="fantasy-public-entry__section-head">
        <span>STARTSEXA</span>
        <strong>LW · C · RW · LD · RD · G</strong>
      </div>
      <div class="fantasy-public-entry__roster">
        ${roster.map(publicRosterPlayerMarkup).join("") || '<div class="fantasy-empty">Ingen låst uppställning hittades.</div>'}
      </div>

      ${former.length ? `
        <div class="fantasy-public-entry__section-head fantasy-public-entry__section-head--history">
          <span>TIDIGARE SPELARE</span>
          <strong>Poängen ligger kvar i lagets total</strong>
        </div>
        <div class="fantasy-public-entry__former">
          ${former.map((player) => {
            const rounds = Array.isArray(player.round_breakdown) ? player.round_breakdown : [];
            return `
              <article class="fantasy-public-former-player">
                <div>
                  <strong class="fantasy-player-name-line">
                    ${countryFlagMarkup(player.country_code)}
                    <span class="fantasy-player-name">${escapeHtml(clean(player.display_gamertag) || t("unknown"))}</span>
                  </strong>
                  <small>${escapeHtml(clean(player.real_team_name) || t("team_not_ready"))} · ${escapeHtml((player.used_slots || []).join(" / ") || "–")} · ${number(player.games)} matcher</small>
                  <div class="fantasy-public-former-player__rounds">
                    ${rounds.map((r) =>
                      '<span>' + escapeHtml(clean(r.round_name) || ("Period " + (r.round_no || "–"))) +
                      ' · ' + escapeHtml(clean(r.slot) || "–") +
                      ' · <strong>' + formatPoints(r.team_points) + ' P</strong>' +
                      (r.is_captain ? ' <em>K</em>' : '') +
                      '</span>'
                    ).join("")}
                  </div>
                </div>
                <b>${formatPoints(player.team_points)} P</b>
              </article>
            `;
          }).join("")}
        </div>
      ` : ""}
    `;
  }

  async function openPublicEntry(entryId) {
    const dialog = $("publicEntryDialog");
    const content = $("publicEntryContent");
    if (!dialog || !content) return;

    content.innerHTML = '<div class="fantasy-public-entry__loading">Hämtar låst lag…</div>';
    dialog.showModal();

    try {
      const result = await sb.rpc("seh_fantasy_public_entry_roster", {
        p_entry_id: Number(entryId),
        p_code: competitionCode()
      });
      if (result.error) throw result.error;
      renderPublicEntry(Array.isArray(result.data) ? result.data[0] : result.data);
    } catch (error) {
      content.innerHTML =
        '<div class="fantasy-public-entry__locked"><h3>Kunde inte hämta laget</h3><p>' +
        escapeHtml(error?.message || String(error)) +
        '</p></div>';
    }
  }

  function renderTeamName() {
    const host = $("teamNameDisplay");
    if (!host) return;
    const linkedName = clean(state.account?.player_name);
    host.textContent = clean(state.entry?.team_name) || (linkedName ? linkedName + " Fantasy" : "–");
  }

  function renderAll() {
    if (!state.competition) {
      renderNeutralLanding();
      updateHeaderAccount();
      applyStaticTranslations();
      return;
    }

    renderHero();
    renderLineup();
    renderFormerPlayers();
    renderMarket();
    renderPlayers();
    renderLeaderboard();
    renderPeriodHub();
    renderTeamName();
    renderTransferStatus();
    updateHeaderAccount();
    applyStaticTranslations();
  }

  function placePlayer(player, slot) {
    if (!player || !slot) return;

    const occupied = state.picks.get(slot);
    const isSwap = state.swapSlot === slot && Boolean(occupied);
    if (occupied && !isSwap) {
      showRosterError(
        slot + " är redan upptagen av " +
        (clean(occupied.player?.display_gamertag) || "en annan spelare") +
        ". Använd Byt på spelarkortet."
      );
      return;
    }

    if (!eligibleSlots(player).includes(slot)) {
      showRosterError(
        (clean(player.display_gamertag) || "Spelaren") +
        " kan inte användas som " + slot + "."
      );
      return;
    }

    const selected = selectedIds();
    if (isSwap && occupied?.player?.id) selected.delete(Number(occupied.player.id));
    if (selected.has(Number(player.id))) {
      showRosterError((clean(player.display_gamertag) || "Spelaren") + " finns redan i laget.");
      return;
    }

    const teamLimit = number(state.competition?.max_players_per_real_team || 2);
    const teamCount = [...state.picks.entries()].filter(([pickSlot, pick]) =>
      pickSlot !== (isSwap ? slot : "") &&
      pick.player?.real_team_id != null &&
      player.real_team_id != null &&
      Number(pick.player.real_team_id) === Number(player.real_team_id)
    ).length;
    if (teamCount >= teamLimit) {
      showRosterError("Du får välja högst " + teamLimit + " spelare från samma riktiga lag.");
      return;
    }

    state.picks.set(slot, {
      player,
      isCaptain: isSwap ? Boolean(occupied.isCaptain) : false
    });
    state.pendingPlacementPlayerId = null;
    state.pickerSlot = null;
    state.swapSlot = null;
    setStatus("saveStatus", "");
    $("positionDialog")?.close();
    $("playerPickerDialog")?.close();
    renderAll();
  }

  function openPositionChooser(player, slots) {
    const dialog = $("positionDialog");
    const choices = $("positionDialogChoices");
    if (!dialog || !choices) {
      placePlayer(player, slots[0]);
      return;
    }

    state.pendingPlacementPlayerId = Number(player.id);
    $("positionDialogPlayer").textContent = player.display_gamertag;

    const positionDialogText = $("positionDialogText");
    const playerSlots = eligibleSlots(player);
    const goalieHybrid = playerSlots.includes("G") && playerSlots.some((slot) => slot !== "G");

    if (goalieHybrid) {
      const outfieldSlots = playerSlots.filter((slot) => slot !== "G");
      positionDialogText.innerHTML =
        "<strong>" + escapeHtml(t("player_can_use_on", {
          name: player.display_gamertag,
          slots: playerSlots.join(" / ")
        })) + "</strong><br>" +
        escapeHtml(t("choose_open_slot")) + "<br>" +
        "<strong>G:</strong> " + escapeHtml(t("goalie_games_only")) + "<br>" +
        "<strong>" + escapeHtml(outfieldSlots.join(" / ")) + ":</strong> " +
        escapeHtml(t("skater_games_only"));
    } else {
      positionDialogText.textContent =
        t("player_can_use_on", {
          name: player.display_gamertag,
          slots: playerSlots.join(" / ")
        }) + " " + t("choose_open_slot");
    }

    choices.innerHTML = slots.map((slot) =>
      '<button type="button" data-place-slot="' + slot + '">' + slot + '</button>'
    ).join("");

    dialog.showModal();
  }

  function pickerPlayers(slot, query = "") {
    const selected = selectedIds();
    const currentPick = state.swapSlot === slot ? state.picks.get(slot) : null;
    if (currentPick?.player?.id) selected.delete(Number(currentPick.player.id));
    const normalizedQuery = clean(query).toLocaleLowerCase("sv-SE");

    return state.pool
      .filter((player) => player.is_available !== false)
      .filter((player) => !currentPick || Number(player.id) !== Number(currentPick.player?.id))
      .filter((player) => !selected.has(Number(player.id)))
      .filter((player) => eligibleSlots(player).includes(slot))
      .filter((player) => {
        if (!normalizedQuery) return true;
        return [player.display_gamertag, player.real_team_name, eligibleSlots(player).join(" ")]
          .join(" ")
          .toLocaleLowerCase("sv-SE")
          .includes(normalizedQuery);
      })
      .sort((a, b) =>
        number(b.price) - number(a.price) ||
        clean(a.display_gamertag).localeCompare(clean(b.display_gamertag), "sv")
      );
  }

  function renderPlayerPicker() {
    const slot = state.pickerSlot;
    const host = $("playerPickerList");
    if (!slot || !host) return;

    const query = clean($("playerPickerSearch")?.value);
    const teamLimit = number(state.competition?.max_players_per_real_team || 2);
    const rows = pickerPlayers(slot, query);
    const swapPick = state.swapSlot === slot ? state.picks.get(slot) : null;

    $("playerPickerTitle").textContent = swapPick
      ? t("swap_player", { name: clean(swapPick.player?.display_gamertag) || slot })
      : t("choose_slot", { slot });
    $("playerPickerCount").textContent = t("picker_count", { count: rows.length, slot });

    host.innerHTML = rows.map((player) => {
      const teamCount = [...state.picks.entries()].filter(([pickSlot, pick]) =>
        pickSlot !== state.swapSlot &&
        pick.player?.real_team_id != null &&
        player.real_team_id != null &&
        Number(pick.player.real_team_id) === Number(player.real_team_id)
      ).length;
      const teamBlocked = teamCount >= teamLimit;
      return `
        <article class="fantasy-picker-player ${teamBlocked ? "is-blocked" : ""}">
          <div class="fantasy-picker-player__portrait-wrap">
            ${portraitMarkup(player, "fantasy-picker-player__portrait")}
            ${teamLogoMarkup(player, "fantasy-team-logo fantasy-team-logo--picker")}
          </div>
          <div class="fantasy-picker-player__info">
            <strong class="fantasy-player-name-line">${countryFlagMarkup(player.country_code)}<span class="fantasy-player-name">${escapeHtml(player.display_gamertag)}</span></strong>
            <small>${escapeHtml(clean(player.real_team_name) || t("team_not_ready"))}</small>
            <span>${escapeHtml(eligibleSlots(player).join(" / "))}</span>
          </div>
          <div class="fantasy-picker-player__price">
            <strong>${format(player.price)}</strong>
            <small>CR</small>
          </div>
          <button type="button" data-pick-player="${player.id}" ${teamBlocked || !competitionOpen() ? "disabled" : ""}>
            ${teamBlocked
              ? t("team_limit_reached", { limit: teamLimit })
              : t("pick_slot_upper", { slot })}
          </button>
        </article>
      `;
    }).join("") || '<div class="fantasy-empty">' + escapeHtml(t("no_eligible_for_slot", { slot })) + '</div>';
  }

  function openPlayerPicker(slot) {
    if (!["LW","C","RW","LD","RD","G"].includes(slot)) return;

    const occupied = state.picks.get(slot);
    if (occupied) {
      showRosterError(
        slot + " är redan upptagen av " +
        (clean(occupied.player?.display_gamertag) || "en annan spelare") +
        ". Använd Byt på spelarkortet."
      );
      return;
    }

    state.swapSlot = null;
    state.pickerSlot = slot;
    if ($("playerPickerSearch")) $("playerPickerSearch").value = "";
    renderPlayerPicker();
    $("playerPickerDialog")?.showModal();
  }

  function openSwapPlayerPicker(slot) {
    if (!["LW","C","RW","LD","RD","G"].includes(slot)) return;

    const occupied = state.picks.get(slot);
    if (!occupied) {
      openPlayerPicker(slot);
      return;
    }

    state.swapSlot = slot;
    state.pickerSlot = slot;
    if ($("playerPickerSearch")) $("playerPickerSearch").value = "";
    renderPlayerPicker();
    $("playerPickerDialog")?.showModal();
  }

  function addPlayer(id) {
    const player = playerById(id);
    if (!player) return;

    const teamLimit = number(state.competition?.max_players_per_real_team || 2);
    if (realTeamCount(player) >= teamLimit) {
      showRosterError("Du får välja högst " + teamLimit + " spelare från samma riktiga lag.");
      return;
    }

    const eligible = eligibleSlots(player);
    const openSlots = eligible.filter((candidate) => !state.picks.has(candidate));
    if (!openSlots.length) {
      const occupied = eligible
        .map((slot) => ({ slot, pick: state.picks.get(slot) }))
        .filter((item) => item.pick);

      if (occupied.length === 1 && eligible.length === 1) {
        showRosterError(
          occupied[0].slot + " är redan upptagen av " +
          (clean(occupied[0].pick.player?.display_gamertag) || "en annan spelare") +
          ". " + (clean(player.display_gamertag) || "Spelaren") +
          " kan bara användas som " + occupied[0].slot + "."
        );
      } else {
        showRosterError(
          "Ingen ledig position för " + (clean(player.display_gamertag) || "spelaren") +
          " (" + eligible.join(" / ") + ")."
        );
      }
      return;
    }

    if (openSlots.length === 1) {
      placePlayer(player, openSlots[0]);
      return;
    }

    openPositionChooser(player, openSlots);
  }

  function removePlayer(slot) {
    state.picks.delete(slot);
    renderAll();
  }

  function setCaptain(id) {
    for (const [slot, pick] of state.picks.entries()) {
      state.picks.set(slot, {
        ...pick,
        isCaptain: Number(pick.player.id) === Number(id)
      });
    }
    renderLineup();
  }

  async function loadLeaderboard() {
    if (!state.competition) return;
    const result = await sb
      .from("v_ehockey_fantasy_leaderboard")
      .select("*")
      .eq("competition_id", state.competition.id)
      .order("total_points", { ascending: false })
      .limit(100);

    if (result.error) throw result.error;
    state.leaderboard = result.data || [];
  }

  async function loadInsights() {
    const result = await sb.rpc("seh_fantasy_public_insights", { p_code: competitionCode() });
    if (result.error) throw result.error;

    state.insights = Array.isArray(result.data)
      ? (result.data[0] || null)
      : (result.data || null);
    state.ownership.clear();

    const rows = Array.isArray(state.insights?.ownership) ? state.insights.ownership : [];
    for (const row of rows) {
      state.ownership.set(Number(row.pool_player_id), row);
    }
  }

  async function loadPublic() {
    const competitionResult = await sb
      .from("ehockey_fantasy_competitions")
      .select("*")
      .order("id", { ascending: true });

    if (competitionResult.error) throw competitionResult.error;

    state.competitions = (competitionResult.data || []).filter((row) =>
      !row?.settings?.archive_role
    );

    const requested = clean(new URLSearchParams(window.location.search).get("competition")).toUpperCase();
    state.competition = requested
      ? (state.competitions.find((row) => clean(row.code).toUpperCase() === requested) || null)
      : null;

    renderCompetitionSelector();

    if (!state.competition) {
      state.pool = [];
      state.leaderboard = [];
      state.insights = null;
      state.ownership.clear();
      return;
    }

    // Populate branding immediately. Secondary data such as leaderboard and
    // insights must never leave the league selector blank.
    renderCompetitionBranding();

    const poolResult = await sb
      .from("ehockey_fantasy_player_pool")
      .select("*")
      .eq("competition_id", state.competition.id)
      .order("price", { ascending: false })
      .order("display_gamertag", { ascending: true });

    if (poolResult.error) throw poolResult.error;

    state.pool = (poolResult.data || []).filter((player) => fantasyCountryAllowed(player.country_code));

    const [leaderboardResult, insightsResult] = await Promise.allSettled([
      loadLeaderboard(),
      loadInsights()
    ]);

    if (leaderboardResult.status === "rejected") {
      console.warn("Fantasy leaderboard kunde inte laddas", leaderboardResult.reason);
      state.leaderboard = [];
    }

    if (insightsResult.status === "rejected") {
      console.warn("Fantasy insights kunde inte laddas", insightsResult.reason);
      state.insights = null;
      state.ownership.clear();
    }
  }

  async function loadTransferState() {
    if (!state.session?.user || !state.competition) {
      state.transferState = null;
      renderTransferStatus();
      return;
    }

    const result = await sb.rpc("seh_fantasy_my_transfer_state", {
      p_code: competitionCode()
    });

    if (result.error) throw result.error;

    state.transferState = Array.isArray(result.data)
      ? (result.data[0] || null)
      : (result.data || null);

    renderTransferStatus();
  }

  async function loadMyEntry() {
    if (!state.session?.user || !state.competition) return;

    const entryResult = await sb
      .from("ehockey_fantasy_entries")
      .select("*")
      .eq("competition_id", state.competition.id)
      .eq("user_id", state.session.user.id)
      .maybeSingle();

    if (entryResult.error) throw entryResult.error;

    state.entry = entryResult.data || null;

    if (!state.entry) {
      state.savedPicks.clear();
      state.savedScores.clear();
      state.savedBreakdowns.clear();
      state.formerPlayers = [];
      // Keep any unsaved draft intact. Auth refreshes must never wipe the user's picks.
      renderAll();
      return;
    }

    state.picks.clear();
    state.savedPicks.clear();
    state.savedScores.clear();
    state.savedBreakdowns.clear();
    state.formerPlayers = [];

    const picksResult = await sb
      .from("ehockey_fantasy_entry_players")
      .select("pool_player_id,slot,is_captain,locked_price")
      .eq("entry_id", state.entry.id);

    if (picksResult.error) throw picksResult.error;

    const savedRows = picksResult.data || [];
    const scoreIds = [...new Set(savedRows.map((row) => Number(row.pool_player_id)).filter(Boolean))];

    if (scoreIds.length) {
      const scoreResult = await sb
        .from("ehockey_fantasy_player_scores")
        .select("pool_player_id,fantasy_points,games")
        .eq("competition_id", state.competition.id)
        .eq("phase", "total")
        .in("pool_player_id", scoreIds);

      if (scoreResult.error) throw scoreResult.error;

      for (const row of scoreResult.data || []) {
        state.savedScores.set(Number(row.pool_player_id), row);
      }

    }

    const breakdownResult = await sb.rpc("seh_fantasy_my_saved_score_breakdown", {
      p_code: competitionCode()
    });

    if (breakdownResult.error) throw breakdownResult.error;

    const breakdownRows = Array.isArray(breakdownResult.data)
      ? breakdownResult.data
      : [];

    for (const row of breakdownRows) {
      if (row?.is_current === false) {
        state.formerPlayers.push(row);
        continue;
      }
      state.savedBreakdowns.set(breakdownKey(row.pool_player_id, row.slot), row);
    }

    for (const row of savedRows) {
      const player = playerById(row.pool_player_id);
      if (!player) continue;

      const savedPick = {
        player,
        isCaptain: Boolean(row.is_captain),
        lockedPrice: row.locked_price
      };

      state.picks.set(row.slot, { ...savedPick });
      state.savedPicks.set(row.slot, { ...savedPick });
    }

    renderAll();
  }

  async function resolveAccount() {
    showGate("loading");

    const sessionResult = await sb.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;

    state.session = sessionResult.data?.session || null;
    state.account = null;

    if (!state.session?.user) {
      showGate("logged-out");
      updateHeaderAccount();
      return;
    }

    if (!isDiscordUser(state.session.user)) {
      showGate("wrong-account");
      updateHeaderAccount();
      return;
    }

    const accountResult = await sb.rpc("seh_fantasy_get_my_account");
    if (accountResult.error) throw accountResult.error;

    state.account = Array.isArray(accountResult.data)
      ? (accountResult.data[0] || {})
      : (accountResult.data || {});

    if (state.account.status === "pending") {
      showGate("pending");
      updateHeaderAccount();
      return;
    }

    if (state.account.status !== "approved" || !clean(state.account.player_key)) {
      showGate("unlinked");
      updateHeaderAccount();
      return;
    }

    showBuilder();
    updateHeaderAccount();
    await loadMyEntry();
    await loadTransferState();
  }

  async function loginWithDiscord() {
    setStatus("gateStatus", "Öppnar Discord…", "working");

    try {
      const existing = await sb.auth.getSession();

      if (existing.data?.session && !isDiscordUser(existing.data.session.user)) {
        await sb.auth.signOut();
      }

      const redirectTo = window.location.origin === "null"
        ? window.location.href
        : window.location.origin + window.location.pathname + window.location.search;

      const { error } = await sb.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo }
      });

      if (error) throw error;
    } catch (error) {
      setStatus("gateStatus", "Fel: " + (error?.message || error), "error");
    }
  }

  async function logout() {
    try {
      await sb.auth.signOut();
    } finally {
      state.session = null;
      state.account = null;
      state.entry = null;
      state.picks.clear();
      state.savedPicks.clear();
      state.savedScores.clear();
      state.savedBreakdowns.clear();
      state.transferState = null;
      renderAll();
      showGate("logged-out");
    }
  }

  async function saveTeam() {
    const budget = number(state.competition?.budget || 100);

    if (!state.session?.user || state.account?.status !== "approved") {
      setStatus("saveStatus", "Du måste vara inloggad och ha en godkänd spelarprofil kopplad.", "error");
      return;
    }

    if (!competitionOpen()) {
      setStatus("saveStatus", t("team_building_not_open"), "error");
      return;
    }

    if (state.picks.size !== 6) {
      setStatus("saveStatus", "Välj alla sex positioner innan du sparar.", "error");
      return;
    }

    if (usedBudget() > budget) {
      setStatus("saveStatus", "Laget är över budget.", "error");
      return;
    }

    const captains = [...state.picks.values()].filter((pick) => pick.isCaptain);
    if (captains.length !== 1) {
      setStatus("saveStatus", "Välj exakt en kapten.", "error");
      return;
    }

    $("saveTeam").disabled = true;
    setStatus("saveStatus", "Sparar laget…", "working");

    try {
      const hadEntry = Boolean(state.entry);
      const picks = [...state.picks.entries()].map(([slot, pick]) => ({
        pool_player_id: pick.player.id,
        slot,
        is_captain: Boolean(pick.isCaptain)
      }));

      const { data, error } = await sb.rpc("seh_fantasy_save_my_team", {
        p_competition_code: competitionCode(),
        p_team_name: "",
        p_picks: picks
      });

      if (error) throw error;

      const transfer = data?.transfer || {};
      const transferCount = number(transfer.count);
      const forcedReplacementCount = number(transfer.forced_replacement_count);
      const paidCount = number(transfer.paid_count);
      const penalty = number(transfer.penalty_points);
      const unlimited = Boolean(transfer.unlimited);

      await loadMyEntry();
      await loadTransferState();
      await Promise.all([loadLeaderboard(), loadInsights()]);
      renderHero();
      renderLeaderboard();
      renderPeriodHub();
      renderMarket();
      renderPlayers();

      let successText = hadEntry
        ? leagueCode() + "-laget är uppdaterat."
        : leagueCode() + "-laget är sparat.";

      if (forcedReplacementCount > 0) {
        successText += " " + forcedReplacementCount + " borttagen spelare ersattes gratis.";
      }

      if (transferCount - forcedReplacementCount > 0) {
        successText += unlimited
          ? " " + (transferCount - forcedReplacementCount) + " byte är gratis inför säsongen/i fri bytesperiod."
          : paidCount > 0
            ? " " + (transferCount - forcedReplacementCount) + " byte · straff −" + format(penalty) + " P."
            : " " + (transferCount - forcedReplacementCount) + " gratis byte använt.";
      } else if (hadEntry && transferCount === 0) {
        successText += " Kaptensbyte/positionsändring kostar inget.";
      }

      setStatus("saveStatus", successText, "success");
    } catch (error) {
      setStatus("saveStatus", "Fel: " + (error?.message || error), "error");
    } finally {
      renderLineup();
    }
  }

  function switchTab(tab) {
    const allowed = new Set(["team", "players", "leaderboard", "rules"]);
    state.activeTab = allowed.has(tab) ? tab : "team";

    $$("[data-tab]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tab === state.activeTab);
    });

    $$("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== state.activeTab;
    });
  }

  document.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      switchTab(tab.dataset.tab);
      return;
    }

    const viewEntry = event.target.closest("[data-view-entry]");
    if (viewEntry) {
      openPublicEntry(viewEntry.dataset.viewEntry);
      return;
    }

    const playerDetail = event.target.closest("[data-player-detail]");
    if (playerDetail) {
      openPlayerDetail(playerDetail.dataset.playerDetail);
      return;
    }

    const openSlot = event.target.closest("[data-open-slot]");
    if (openSlot) {
      openPlayerPicker(openSlot.dataset.openSlot);
      return;
    }

    const pickPlayer = event.target.closest("[data-pick-player]");
    if (pickPlayer) {
      const player = playerById(pickPlayer.dataset.pickPlayer);
      if (player && state.pickerSlot) placePlayer(player, state.pickerSlot);
      return;
    }

    const add = event.target.closest("[data-add]");
    if (add) {
      addPlayer(add.dataset.add);
      return;
    }

    const swap = event.target.closest("[data-swap]");
    if (swap) {
      openSwapPlayerPicker(swap.dataset.swap);
      return;
    }

    const captain = event.target.closest("[data-captain]");
    if (captain) {
      setCaptain(captain.dataset.captain);
      return;
    }

    const placement = event.target.closest("[data-place-slot]");
    if (placement) {
      const player = playerById(state.pendingPlacementPlayerId);
      if (player) placePlayer(player, placement.dataset.placeSlot);
    }
  });

  $("discordLogin")?.addEventListener("click", loginWithDiscord);
  $("closePlayerPickerDialog")?.addEventListener("click", () => {
    state.pickerSlot = null;
    state.swapSlot = null;
    $("playerPickerDialog")?.close();
  });
  $("playerPickerDialog")?.addEventListener("cancel", () => {
    state.pickerSlot = null;
    state.swapSlot = null;
  });
  $("playerPickerSearch")?.addEventListener("input", renderPlayerPicker);
  $("closePublicEntryDialog")?.addEventListener("click", () => {
    $("publicEntryDialog")?.close();
  });
  $("publicEntryDialog")?.addEventListener("cancel", () => {});
  $("closePlayerDetailDialog")?.addEventListener("click", () => {
    $("playerDetailDialog")?.close();
  });
  $("playerDetailDialog")?.addEventListener("cancel", () => {});

  $("closePositionDialog")?.addEventListener("click", () => {
    state.pendingPlacementPlayerId = null;
    $("positionDialog")?.close();
  });
  $("positionDialog")?.addEventListener("cancel", () => {
    state.pendingPlacementPlayerId = null;
  });
  $("saveTeam")?.addEventListener("click", saveTeam);
  $("logoutButton")?.addEventListener("click", logout);

  $("accountButton")?.addEventListener("click", async () => {
    if (state.session?.user) await logout();
    else await loginWithDiscord();
  });

  $("marketSearch")?.addEventListener("input", renderMarket);
  $("marketPosition")?.addEventListener("change", renderMarket);
  $("playersSearch")?.addEventListener("input", renderPlayers);
  $("playersPosition")?.addEventListener("change", renderPlayers);
  $("competitionSelect")?.addEventListener("change", (event) => {
    const code = clean(event.target?.value);
    if (!code) return;
    if (state.competition && code === competitionCode()) return;
    const url = new URL(window.location.href);
    url.searchParams.set("competition", code);
    url.searchParams.set("lang", state.language);
    window.location.href = url.toString();
  });

  $("languageSelect")?.addEventListener("change", (event) => {
    setLanguage(clean(event.target?.value).toLowerCase());
  });

  document.querySelector("[data-jump-team]")?.addEventListener("click", () => {
    if (!state.competition) {
      $("competitionSelect")?.focus();
      return;
    }
    switchTab("team");
    $("teamPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector("[data-jump-rules]")?.addEventListener("click", () => {
    switchTab("rules");
    $("rulesPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  sb.auth.onAuthStateChange((event, session) => {
    // Do not reload the builder on token refresh / duplicate SIGNED_IN events:
    // that could wipe a draft before it is saved.
    if (event === "SIGNED_OUT") {
      state.session = null;
      state.account = null;
      state.entry = null;
      state.picks.clear();
      renderAll();
      showGate("logged-out");
      return;
    }

    const currentUserId = state.session?.user?.id || "";
    const nextUserId = session?.user?.id || "";

    if (event === "SIGNED_IN" && nextUserId && nextUserId !== currentUserId) {
      window.setTimeout(() => {
        resolveAccount().catch((error) => {
          console.warn("Fantasy auth sign-in refresh failed", error);
        });
      }, 0);
    }
  });

  applyStaticTranslations();
  switchTab("team");

  (async () => {
    try {
      await loadPublic();
      renderAll();

      if (state.competition) {
        await resolveAccount();
      } else {
        const sessionResult = await sb.auth.getSession();
        if (!sessionResult.error) {
          state.session = sessionResult.data?.session || null;
          updateHeaderAccount();
        }
      }
    } catch (error) {
      console.error(seasonLabel() + " Fantasy kunde inte laddas", error);
      showGate("logged-out", "Fantasy-data kunde inte hämtas just nu.");
      setStatus("gateStatus", "Fel: " + (error?.message || error), "error");

      if (!$("playersGrid").children.length) {
        $("playersGrid").innerHTML = '<div class="fantasy-empty">Fantasy-data kunde inte hämtas just nu.</div>';
      }
    }
  })();
})();
