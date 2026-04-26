# Körsbärskartan Sverige

En enkel statisk webbapp som visar körsbärsträd i Sverige på karta.

## Det här finns nu

- Interaktiv karta med Leaflet när biblioteken laddar korrekt.
- Reservkarta från OpenStreetMap om Leaflet inte går att ladda.
- Knapp för att hämta data från OpenStreetMap via Overpass.
- Inbyggt demoläge så sidan känns levande direkt.
- Uppladdning av egen `GeoJSON`, `JSON` eller `CSV`.
- Filter för bred eller strikt tolkning av körsbärsträd.
- Sökning på plats, art och taggar.
- Resultatlista under kartan.

## Viktigt om kvaliteten

OpenStreetMap innehåller inte alla körsbärsträd i Sverige i verkligheten. Sidan visar träd som har kartlagts och fått taggar som gör att de kan kännas igen som körsbär eller `Prunus`.

## CSV-format

CSV måste minst innehålla:

```csv
name,lat,lon,species,genus,place
Kungsträdgården,59.3317,18.0731,Prunus serrulata,Prunus,Stockholm
