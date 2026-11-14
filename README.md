# sweehockey-svg.github.io

### ECL ’27 Winter: registrerade lag och spelare

Uppdatera säsongsvyn från den offentliga anmälningsligan med
`pwsh -File scripts/fetch-ecl27-winter-rosters.ps1`. Kontrollera och publicera
den genererade `ecl27-winter-rosters.json`. Filen ersätts bara om alla
lagtrupper kunde läsas och antalet spelare stämmer med laglistan.
SportsGamer-ID används för profilkoppling; ansökt division är inte en slutlig placering.
