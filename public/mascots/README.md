# Versado-mascottes: productie-assets

Deze map bevat alleen **geoptimaliseerde productie-assets** van de
Versado-mascottes. Originele hoge-resolutiebestanden en mastergeneraties
horen hier niet. Bewaar ze apart: ze zijn de bron om later opnieuw te
exporteren of naar animatie (Rive) over te zetten.

De achtergrond, het karakter en de technische afspraken staan uitgebreider
in `docs/VERSADO-DESIGN.md` onder "Mascottes".

## De mascottes

Gezamenlijk principe: **"Ik ontdek dit samen met jou."**

**NOVI**: vrolijk · ontdekkend · ondeugend. Een jongetje.
Rol: spelen, experimenteren, korte oefeningen, dagelijkse motivatie en
verrassingen. De goedgekeurde Novi-afbeeldingen in `static/novi/` vormen
samen met de character sheet de visuele canon: nieuwe Novi-assets sluiten
daar visueel op aan.

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
- Aanwezig en geregistreerd:
  - Novi: `greeting` (in gebruik op Vandaag), `playing`, `success`,
    `encourage`, `thinking` en `discovery` (beschikbaar, nog nergens
    ingezet);
  - family: `welcome` (in gebruik op de publieke homepage).
- Nog nodig, met echte transparantie: Novi `idle`, `reading`, `celebrate`
  en `sleep`. De aangeleverde PNG's daarvan zijn RGB met een
  meegeschilderd schaakbord in plaats van een alfakanaal.
- Niet in een bestandsnaam: `v1`, `v2`, `final` of synoniemen voor een
  bestaande state. Geen nieuwe states zonder bewuste ontwerpkeuze.
- Niet in de afbeelding: tekst, tekstballonnen of een achtergrond. Tekst
  komt altijd via de app-vertalingen.
- De lege mappen staan in git dankzij een `.gitkeep`. Laat die staan.

### States voor Novi

Functionele toestanden in Versado, geen willekeurige emoties. Gebruik ze
consequent met deze betekenis:

| state | betekenis |
|---|---|
| `idle` | neutrale, rustige Novi: aanwezig zonder specifieke reactie |
| `greeting` | vriendelijke begroeting, bv. bovenaan Vandaag |
| `playing` | actief, speels, klaar om iets te doen: spellen en speelse oefeningen |
| `success` | positieve reactie op een goed antwoord of een kleine gelukte actie |
| `encourage` | aanmoediging na een fout antwoord of mislukte poging, of als opnieuw proberen logisch is |
| `thinking` | nadenken: een vraag, quiz of reflectiemoment waarop de gebruiker moet nadenken |
| `discovery` | iets nieuws ontdekken: nieuwe content, een verrassing of een inzicht |
| `reading` | daadwerkelijk lezen of studeren |
| `celebrate` | een duidelijk groter individueel feestmoment; niet voor elk goed antwoord |
| `sleep` | rust, inactiviteit of het einde van een dag; niet automatisch overal 's nachts tonen zonder productreden |

**`success` of `celebrate`?** Voorkom beloningsinflatie. `success` is
gewone positieve feedback: een goed antwoord, een kleine oefening gehaald.
`celebrate` alleen voor duidelijk grotere individuele momenten. Echt
belangrijke Versado-mijlpalen krijgen later de hele familie
(`family`/`celebrate`). Dus niet na elk goed antwoord een springende Novi
met confetti.

**`encourage` bij fouten.** Novi reageert op een fout nooit boos,
teleurgesteld, verdrietig, bestraffend of afkeurend. De betekenis is:
"probeer het nog eens, je bent iets aan het ontdekken." Novi is een
metgezel, geen beoordelende leraar.

**Een bibliotheek, geen decoratie.** Dat een state bestaat, is geen reden
om hem te gebruiken. Een feature toont Novi alleen als de state daar
inhoudelijk iets toevoegt: niet elke kaart versieren, geen lege ruimte
vullen, Novi niet permanent op elke pagina.

**Betekenis nooit alleen in het beeld.** Mascottes zijn decoratief voor
schermlezers (`alt=""`). Wat Novi uitdrukt, staat altijd ook als gewone
tekst in de interface: een fout antwoord is nooit alleen te zien aan
`encourage`; de bestaande tekstuele feedback blijft leidend.

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
met een zwarte, witte of meegeschilderde schaakbord-achtergrond wordt niet
omgezet: uitsnijden verandert de randen, en bij Novi's donkere vacht en
zwarte lijnen gaat dat zichtbaar mis.

Conversie (voor de hele set gelijk): het bron-canvas (bij Novi 1312x1199)
proportioneel naar 512 px breed, LANCZOS, WebP kwaliteit 88, method 6,
alpha_quality 100. Niet bijsnijden, zodat Novi in elke pose even groot is.

Pagina's verwijzen nooit rechtstreeks naar deze bestanden. Ze gebruiken
alleen `MascotSlot` met een personage en state, bv.
`<MascotSlot character="novi" state="success" />` of
`<MascotSlot character="family" state="welcome" />`
(`src/components/versado/MascotSlot.tsx`).

## Later: Rive

Als er later animatie (Rive) achter `MascotSlot` komt, blijven deze WebP's
gewoon in gebruik: als terugval bij `prefers-reduced-motion`, tijdens het
laden, bij een fout, op plekken waar beweging niets toevoegt, en op
apparaten of browsers waar animatie ongewenst is. Pagina's veranderen dan
niet; alleen de renderer in `MascotSlot` krijgt er een variant bij.
