# Match-TV (testläge)

Publik adress: `/match-tv/`. Menyn på huvudsidan länkar hit.

## Sända

1. Öppna `/lab/broadcast-studio/SV/` i kontrollrummet.
2. Välj lag, scen och grafiken som ska visas.
3. Lägg in spelarens Twitch-kanal, ladda videon och välj LIVE-scenen.
4. Kontrollera `/match-tv/` i en separat flik. Tittaren väljer själv ljud.

Match-TV återanvänder SV-studions befintliga sändningskanal. OBS-vyn fungerar
fortfarande som tidigare. Ingen ny datakopia eller behörighetsändring görs.

Publika vyer läser sändningsläget var tionde sekund när fliken är synlig.
Oförändrat läge renderas inte om och samtidiga läsanrop förhindras.
30 synliga tittare ger ungefär tre läsanrop per sekund för sändningsläget,
utöver turneringsdata vid sidstart och videokällans egna anrop.

Video går via den befintliga Twitch/HLS-resolvern och levereras direkt till
tittaren. Den här sidan skickar inte en ny videoström. Resolver/CDN,
webbläsarens autoplay-regler och källstreamens tillgänglighet påverkar
uppspelningen. Liveuppspelning och 30 samtidiga tittare behöver verifieras
med en verklig pågående match; statisk grafik är inte ett belastningstest.

Helskärm väljer hela spelarytan, så även grafiken följer med.
Ljudval och omladdning är lokala och ändrar inte kontrollrummets inställningar.
