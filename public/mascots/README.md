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

De namen Varo, Vera en Novi worden nooit vertaald. Eigenschappen en
omschrijvingen wel, met korte, natuurlijke woorden per taal die dezelfde
persoonlijkheid overbrengen (geen letterlijke vertaling).

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
- De eerste bestanden (beide in gebruik):
  - `static/novi/novi-greeting.webp`: begroeting op Vandaag;
  - `static/family/family-welcome.webp`: introductie op de publieke homepage.
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
| `celebrate` | gereserveerd voor betekenisvolle momenten in de app (mijlpaal, cursus afgerond, bijzondere prestatie, promotie, lange reeks, gezamenlijk spelmoment); nog geen bestand |

`family-welcome` en `family-celebrate` zijn dus nadrukkelijk verschillende
afbeeldingen met een verschillend doel. Dat `family-welcome` bestaat,
betekent niet dat de familie overal als decoratie mag verschijnen.

## Een afbeelding toevoegen

1. Zet het bestand in de juiste map met de juiste naam, bv.
   `static/novi/novi-greeting.webp`.
2. Registreer het in `src/lib/mascots.ts` (`STATIC_ASSETS`) met de
   afmetingen van het bestand, bv. `greeting: { width: 512, height: 512 }`.
   Een state die niet geregistreerd is, toont nergens iets. Welke states
   per personage bestaan staat ook daar (`family` heeft zijn eigen lijst).
3. Draai `npm run test:mascots`. Die controleert dat elk geregistreerd
   bestand bestaat en dat elk bestand in deze mappen een geldige naam heeft.

Lever bronbestanden met echte transparantie aan (een alfakanaal). Een PNG
waarin het transparantie-schaakbord is meegeschilderd moet eerst worden
uitgesneden, en dat gaat ten koste van de randen.

Pagina's verwijzen nooit rechtstreeks naar deze bestanden. Ze gebruiken
alleen `<MascotSlot character="novi" state="greeting" />` of
`<MascotSlot character="family" state="welcome" />`
(`src/components/versado/MascotSlot.tsx`).
