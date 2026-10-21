# Match-TV: gästchatt och moderering

Gäster väljer namn. Alla deras meddelanden kräver godkännande. De märks alltid **Gäst**. Inloggade med redan godkänd Discord/gamertag använder befintlig verifiering och skriver direkt. En chattblockering ger inte någon bredare avstängning från webbplatsen.

Logga in med webbplatsens vanliga adminkonto på samma domän och öppna Match-TV. **Adminmoderering** visas under formuläret: Godkänn/Neka, blockeringstid och aktiva blockeringar med möjlighet att häva. Enbart den befintliga databasrollen admin får moderera; ingen ny administratör har lagts till.

- Konto: blockerar kontots chatt-RPC. Den som loggar ut kan försöka som gäst, men måste då genom modereringskön.
- Gäst: blockerar en slumpmässig webbläsarhemlighet, lagrad lokalt och hashad på servern. Att byta namn tar inte bort blockeringen. Rensad lagring/ny webbläsare kan kringgå den.
- IP: tidsbegränsad kompletterande nätblockering från Supabase-gatewayens forwarded-IP. En ny nätadress/VPN kan kringgå den, och andra som delar nät kan drabbas. Funktionen är inte säker identifikation av en person. Rå IP visas inte för admin och lagras inte i applikationens chatttabeller; jämförelsen använder HMAC med privat slumpnyckel.

Tider: 1 timme, 24 timmar, 7 dagar. Blockering döljer det aktuella meddelandet; för gäster nekas även väntande meddelanden från samma identifierare/nät. Att häva en blockering publicerar inte tidigare nekade meddelanden.

Gäster har 15 sekunders skrivpaus, högst 10 meddelanden/10 minuter och fem väntande meddelanden. Ett nät har högst 30 gästmeddelanden/10 minuter. Privat kö max 1000 meddelanden. Dessa spärrar kontrolleras på servern med transaktionslås; webbläsarspärren är bara återkoppling. CORS/besökarens namn används inte som behörighet.

Kön visar högst 100 äldsta väntande meddelanden och bara sådana yngre än ett dygn. Godkända chattmeddelanden visas i sju dagar, högst 100 senaste. Ett dagligt databasjobb rensar privata gästmeddelanden äldre än sju dagar och utgångna blockeringar. Gästnamn och texter ska inte betraktas som verifierad identitet. Publicera inte känsliga uppgifter från kön.

Schema: `supabase/match-tv-guest-chat.sql`. Privata tabeller med RLS utan direkt klientåtkomst, publika invoker-wrappers, avgränsade definer-funktioner i icke-exponerat schema. Publik läs-RPC returnerar endast godkända meddelanden och inga användar-, gäst- eller IP-identifierare. Direkt åtkomst till befintliga kontomeddelanden är oförändrad.

Test: `supabase/test-match-tv-guest-chat.sql` testar roller, privat kö, godkännande, nekad åtkomst, rate limit, döljning och tre sorters blockering/hävning i en återställd transaktion. `match-tv/test-guest-chat.cjs` använder isolerade simulerade webbläsarvyer. Kör aldrig publika testsändningar utan tillstånd.
