# Match-TV (testläge)

Publik adress: `/match-tv/`. Menyn på huvudsidan länkar hit.

## Sända

1. Öppna `https://swnworks.se/broadcast-studio/SV/` i kontrollrummet.
2. Välj lag, scen och grafiken som ska visas.
3. Lägg in spelarens Twitch-kanal, ladda videon och välj LIVE-scenen.
4. Kontrollera `/match-tv/` i en separat flik. Tittaren väljer själv ljud.

Match-TV bäddar in samma kanoniska SWNWORKS-vy som OBS, med `obs=1&viewer=1`.
Den äldre kopian under `/lab/broadcast-studio/` används inte. Samma signerade
SportsGamer-underlag och valda laguppställning följer sändningen, även för
spelare utanför det permanenta registret. Ingen ny datakopia importeras.
Ljud och statusmeddelanden kontrollerar både exakt ursprung och iframe-fönster;
ingen joker används för meddelanden mellan domänerna.

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
