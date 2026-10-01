# Versado-mascottes: productie-assets

Deze map bevat alleen **geoptimaliseerde productie-assets** van de
Versado-mascottes. Originele hoge-resolutiebestanden en mastergeneraties
horen hier niet. Bewaar ze apart: ze zijn de bron om later opnieuw te
exporteren of naar animatie (Rive) over te zetten.

De achtergrond, het karakter en de technische afspraken staan uitgebreider
in `docs/VERSADO-DESIGN.md` onder "Mascottes".

## De mascottes

Gezamenlijk principe: **"Ik ontdek dit samen met jou."**

**NOVI**: vrolijk · ontdekkend · ondeugend.
Rol: spelen, experimenteren, korte oefeningen, dagelijkse motivatie en
verrassingen.

**VARO**: nieuwsgierig · energiek · speels.
Rol: ontdekken, voortgang, competitie en grotere doelen.

**VERA**: warm · slim · rustig.
Rol: begrijpen, lezen, verdieping en reflectie.

Accessoires zijn optioneel. Ze komen alleen in beeld als ze iets toevoegen
aan de activiteit of het verhaal van de pose.

## Stand

- **Novi** wordt als eerste uitgerold, met statische afbeeldingen.
- **Family**: composities waarin Varo, Vera en Novi samen staan.
- Losse afbeeldingen van **Varo en Vera** volgen later. Voeg die nu nog
  niet toe.
- Er is nog geen Rive. Voeg geen `.riv`-bestanden toe.

## Structuur en naamgeving

```
public/mascots/
  README.md
  static/
    novi/      losse statische afbeeldingen van Novi
      novi-<state>.webp
    family/    Varo, Vera en Novi samen in één compositie
      family-<state>.webp
```

- Formaat: **WebP met transparante achtergrond**.
- Bestandsnamen: **lowercase kebab-case**.
  - Losse Novi-assets: `novi-<state>.webp`.
  - Family-assets: `family-<state>.webp`.
- De eerste bestanden:
  - `static/novi/novi-greeting.webp` (staat er al);
  - `static/family/family-welcome.webp` (wordt nog handmatig toegevoegd).
- Niet in een bestandsnaam: `v1`, `v2`, `final` of synoniemen voor een
  bestaande state. Geen nieuwe states zonder bewuste ontwerpkeuze.
- Niet in de afbeelding: tekst, tekstballonnen of een achtergrond. Tekst
  komt altijd via de app-vertalingen.
- De lege mappen staan in git dankzij een `.gitkeep`. Laat die staan.

### States voor Novi

Functionele toestanden in Versado, geen willekeurige emoties:

| state | betekenis |
|---|---|
| `idle` | rustig aanwezig, er gebeurt niets bijzonders |
| `greeting` | begroet de gebruiker |
| `thinking` | denkt mee, wacht op een antwoord |
| `discovery` | ontdekt iets nieuws, samen met de gebruiker |
| `reading` | leest of verdiept zich |
| `playing` | speelt of oefent kort |
| `success` | een goed antwoord, een gelukte stap |
| `encourage` | moedigt aan na een fout: nieuwsgierig of positief, nooit boos, verdrietig of teleurgesteld |
| `celebrate` | viert een mijlpaal |
| `sleep` | rust (bv. 's nachts of na lange inactiviteit) |

### States voor family

| state | betekenis |
|---|---|
| `welcome` | de algemene introductie van de drie mascottes samen |
| `celebrate` | gereserveerd voor betekenisvolle mijlpalen en prestaties, niet als algemene introductie |

`family-welcome` en `family-celebrate` zijn dus nadrukkelijk verschillende
afbeeldingen met een verschillend doel.

## Een afbeelding toevoegen

1. Zet het bestand in de juiste map met de juiste naam, bv.
   `static/novi/novi-greeting.webp`.
2. Registreer het in `src/lib/mascots.ts` (`STATIC_ASSETS`) met de
   afmetingen van het bestand, bv. `greeting: { width: 512, height: 512 }`.
   Een state die niet geregistreerd is, toont nergens iets. Family-assets
   hebben nog geen plek in het register; dat volgt als ze in de app worden
   gebruikt.
3. Draai `npm run test:mascots`. Die controleert dat elk geregistreerd
   bestand bestaat en dat elk bestand in deze mappen een geldige naam heeft.

Pagina's verwijzen nooit rechtstreeks naar deze bestanden. Ze gebruiken
alleen `<MascotSlot character="novi" state="greeting" />`
(`src/components/versado/MascotSlot.tsx`).
