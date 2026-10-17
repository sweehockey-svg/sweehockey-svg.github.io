# Kartläggning: permanent spelarregister och tillfälliga grafikdata

Kontrollerad 18 oktober 2026 mot produktionsdatabasen och GitHubs main-grenar. Detta är en läsande kartläggning, inte en raderingslista. Inga importjobb, åtkomstregler eller befintliga data har ändrats.

## Gränsen som ska upprätthållas

Permanent spelarurval: verifierad SE/NO/DK-nationalitet eller faktisk SEC/SCL-spelhistorik, oavsett nationalitet. Enbart en registrering i en laguppställning räcker inte. Manuellt fastställd nationalitet får inte skrivas över. Befintliga spelarposter, bildpubliceringar, meriter, Fantasy och matchhistorik ska bevaras under migreringen.

Grafikens fullständiga turneringsunderlag får omfatta andra spelare, men ska hämtas separat och användas tillfälligt. Publicerade bilder kopplas läsande via SportsGamer-ID; det kräver inte att en ny spelarprofil importeras.

## Skrivande flöden

| Flöde | Vad det skriver | Bedömning |
| --- | --- | --- |
| `sync-swedish-players.yml` | Verifierat urval i `private.sportsgamer_storage_scope` och centrala spelaridentiteter | Urvalsgränsen finns i källexporten. Bevara nationalitetsresolvern och låsta manuella beslut. |
| `sync-current-swedish-player-stats.yml` och `sync-swedish-player-stats.yml` | Statistik och meritunderlag för valda spelar-ID:n | ID-listan avgränsas till registerverifierad SE/NO/DK eller verifierad svensk turneringshistorik. |
| `sync-broadcast-league-rosters.yml` | `sportsgamer_league_teams_current`, `sportsgamer_league_roster_current`, turneringsstatistik och `sportsgamer_team_player_stats` | Bred turneringsimport. Anropar samma statistikimportskript som det avgränsade flödet, men med turneringens samtliga spelar-ID:n. En delad importerare får därför inte begränsas utan att även dessa anrop migreras. |
| WV/FCL-grenen i Broadcast-jobbet | Även `graphics_private.sports_matches` och `graphics_private.sports_player_matches` | Matchunderlaget är permanent trots namnet `graphics_private`. Det tillfälliga grafikjobbet behöver inte denna import. |
| `sync-scl27-official-teams.yml` → `sync-fantasy-sportsgamer.yml` | Gemensamma SCL-trupper, tabeller, spelarstatistik och Fantasy-underlag | Schemalagt, sammanbyggt flöde. Får inte stoppas som om det bara vore grafikimport. |
| Recordbook ECL/SCL | Match- och målhistorik i separata recordbook-källor | Inte samma sak som att skapa spelarprofiler. Ingen ändring/rensning ingår i denna migrering utan separat beroendekontroll. |
| `fetch-graphics-data.yml` | Endast sanerat JSON-resultat som tidsbegränsad GitHub-artifact | Ingen Supabase-import. Används av grafikens hämtknapp och periodurval. |

Broadcast-importen kan startas via den befintliga adminfunktionen `seh-admin-sync` med jobbet `broadcast_league_rosters`, från Broadcast-launchern eller via workflow-dispatch. Ändringar av listade källfiler kan också starta den genom workflowets push-trigger. Standardlistan omfattar 523–527, 529 och 532; SCL 527 delegeras till det gemensamma Fantasy-flödet. Den granskade push-grenen väljer WV/FCL (529, 532).

## Läsberoenden som måste migreras först

| Konsument | Nuvarande beroende | Nödvändig kontroll före stopp |
| --- | --- | --- |
| Graphics Studio | Första laddningen läser `v_broadcast_players_public` / `v_broadcast_teams_public`; den nya hämtknappen ersätter sedan sidans underlag i minnet | Testa första laddning, ligabyte, bilder och felhantering utan nya breda databasimporter. |
| Broadcast Studio, OBS och tittarlägen | Alla läser samma offentliga Broadcast-vyer, även när operatören inte är inloggad i OBS-fönstret | Ett operatörsanrop till en inloggningsskyddad funktion räcker inte som ersättning. Dataförsörjningen till själva OBS-/tittarfönstret måste också verifieras. |
| Äldre `lab/broadcast-studio` och dess launcher | Samma vyer; launchern startar det skrivande Broadcast-jobbet | Migrera både läsningen och uppdateringsknappen. |
| `match-image-generator.js` | SCL-statistik via `v_broadcast_players_public`, med befintlig reservkälla | Behåll namn, nummer, bilder och statistik i alla fyra textlägen. |
| Aktuella laguppställningar/registreringar på huvudsidan | Bland annat `v_ecl27_current_roster_public` och regionala registreringsvyer | Verifiera kompletta laguppställningar, inte bara grafikens topplistor. |
| Personliga meriter och statistikvyer | Delade `sportsgamer_team_player_stats` | Historiska rader måste finnas kvar även när nya grafikförfrågningar inte längre importeras. |

Produktionsdatabasen har 19 direkta vyberoenden till spelarstatistik-/roster-tabellerna. Exempel är `v_broadcast_players_public`, `v_broadcast_teams_public`, `v_swedish_players`, `v_ehockey_player_tournaments_all`, `v_ehockey_stat_podium_merits_v1` och `v_ehockey_goalie_podium_merits_v1`. Antalet är direkta beroenden, inte en fullständig inventering av alla transitiva vyer/funktioner.

## Aktuell datamängd: statistik

Antal unika spelar-ID:n per liga i `sportsgamer_team_player_stats`. "Inte verifierade" betyder att ID:t vid kontrollen inte matchade registerverifierad SE/NO/DK eller verifierad svensk turneringshistorik. Det omfattar även oklara/nyregistrerade spelare och är därför **inte** bevis för att de ska raderas. Spelare kan finnas i flera ligor; kolumnerna ska inte summeras som unika personer.

| Liga | Spelare | Inte verifierade för permanent urval |
| --- | ---: | ---: |
| SEC 21 (520) | 64 | 0 |
| WECL (523) | 126 | 118 |
| GCL Div I (524) | 87 | 77 |
| GCL Div II (525) | 139 | 138 |
| GCL Pokal (526) | 222 | 211 |
| SCL 27 (527) | 149 | 1 |
| FCL 27 (529) | 592 | 532 |
| WV 4 Nations (532) | 99 | 77 |

SCL-avvikelsen kontrollerades separat: ID 9942 saknade verifierad nationalitet/svensk spelhistorik och hade noll matcher i den aktuella SCL-statistiken. Att automatiskt godkänna personen enbart för att den finns i truppen skulle bryta mot regeln om faktisk spelhistorik. Ingen nationalitet eller behörighet har därför antagits/ändrats.

## Säker ordning för nästa implementation

1. Ge Broadcast-operatören tillfällig hämtning och verifiera hur exakt samma sanerade data når OBS/tittarläget utan permanent spelarimport. Behåll fungerande utdata vid timeout, utloggning och ligabyte.
2. Migrera den äldre launcherns uppdateringsknapp och grafikens första laddning. Ta även med SCL-matchbildens statistik och aktuella roster-vyer i regressionstesterna.
3. Dela uttryckligen på permanent urvalsimport, tillfälligt fullständigt turneringsunderlag och Fantasy-/historikimport. Lägg kontrollen vid skrivgränsen så att en ny anropare inte kan kringgå urvalsregeln.
4. När konsumenterna ovan är verifierade: stäng de breda skrivningarna för grafik. Behåll de avgränsade profil-/statistikjobben och nödvändiga SCL/Fantasy-jobben.
5. Ta därefter fram en separat granskningslista för äldre poster. Radera ingenting utan uttryckligt godkännande och kontroll av bilder, meriter och matchreferenser.

Återkörbar, läsande kontroll finns i `scripts/audit-player-storage-boundary.sql`. Den ändrar inga data och visar endast antal och vynamn, inte privata profiluppgifter.
