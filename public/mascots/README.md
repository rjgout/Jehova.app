# Versado-mascottes: canon en assets

Deze map scheidt visuele referenties, productie-assets, ontwerpkopieën en
toekomstige animatiebronnen. De definitieve tekstuele character-canon staat
in `docs/VERSADO-CHARACTER-CANON.md`.

De achtergrond, het karakter en de technische afspraken staan uitgebreider
in `docs/VERSADO-DESIGN.md` onder "Mascottes".

## De mascottes

Gezamenlijk principe: **"Ik ontdek dit samen met jou."**

**NOVI**: vrolijk · ontdekkend · ondeugend. Een jongetje.
Rol: spelen, experimenteren, korte oefeningen, dagelijkse motivatie en
verrassingen.

**VARO**: nieuwsgierig · energiek · speels.
Rol: ontdekken, voortgang, competitie en grotere doelen.

**VERA**: warm · slim · rustig.
Rol: begrijpen, lezen, verdieping en reflectie.

De goedgekeurde afbeeldingen in `static/novi/`, `static/varo/` en
`static/vera/` vormen samen met de character sheets de visuele canon: nieuwe
assets sluiten daar visueel op aan.

Accessoires zijn optioneel. Ze komen alleen in beeld als ze iets toevoegen
aan de activiteit of het verhaal van de pose.

De namen Varo, Vera en Novi worden nooit vertaald. Eigenschappen en
omschrijvingen wel, met korte, natuurlijke woorden per taal die dezelfde
persoonlijkheid overbrengen (geen letterlijke vertaling).

## Stand

- **Novi, Varo en Vera** hebben elk alle tien states als statische
  afbeelding (512x512, zelfde canvas per personage).
- **Persoonlijke gids**: elke gebruiker kiest één van de drie
  (`User.companion`, standaard Novi). Keuze bij de onboarding ("Kies je
  gids"), te wijzigen op het profiel ("Jouw gids"). Persoonlijke momenten
  tonen de gekozen gids; zie "Persoonlijke gids" hieronder.
- **Family**: composities waarin Varo, Vera en Novi samen staan, alleen op
  gedeelde momenten.
- Er is nog geen Rive. Voeg geen `.riv`-bestanden toe.

## Persoonlijke gids

De app kiest de reactie (de state), de gebruiker kiest wie hem uitvoert:

```
feature → <PersonalMascot state="success" />
        → gekozen gids (User.companion, via CompanionProvider in de layout)
        → <MascotSlot character="vera" state="success" />
        → geregistreerde asset (nu WebP, later Rive)
```

- `src/lib/companion.ts` is de enige plek die de databasewaarde
  (`NOVI`/`VARO`/`VERA`) en het personage (`novi`/`varo`/`vera`) op elkaar
  afbeeldt. Opslaan gaat via `PATCH /api/account { companion }`.
- `src/components/versado/PersonalMascot.tsx` levert `PersonalMascot`,
  `CompanionProvider` en `useCompanion`. Een feature schrijft dus nooit zelf
  `user.companion ?? "novi"`.
- `MascotSlot` blijft generiek. Contextueel beeld van één bepaald personage
  of van de familie gebruikt `MascotSlot` direct.
- In de gewone app-flow staat alleen de gekozen gids in beeld, nooit de drie
  naast elkaar; dat gebeurt alleen bij de keuze (onboarding, profiel) en op
  familiemomenten.

## Structuur en naamgeving

```
public/mascots/
  README.md
  references/  visuele bron van waarheid; nooit door de app geladen
  static/
    novi/      losse statische afbeeldingen van Novi
      novi-<state>.webp
    varo/      losse statische afbeeldingen van Varo (varo-<state>.webp)
    vera/      losse statische afbeeldingen van Vera (vera-<state>.webp)
    family/    Varo, Vera en Novi samen in één compositie
      family-<state>.webp
  figma/       afgeleide ontwerpkopieën; geen productiebron
  rive/        conventies voor toekomstige animatie; nu geen runtime
```

## Asset hierarchy

### `references/`

Visuele bron van waarheid: character canon, modelsheets, kleurreferenties,
familieverhoudingen en voorbeeldposes. Deze bestanden worden niet door de
app gerenderd. De eigenaar levert de officiële referentiebeelden; ontbrekende
bestanden worden niet gegenereerd of vervangen.

### `static/`

Productie-assets voor de app. Features gebruiken uitsluitend
`MascotSlot(character, state)`; alleen `src/lib/mascots.ts` kent de
assetpaden.

### `figma/`

Deterministisch van `static/` afgeleide, geoptimaliseerde ontwerpkopieën.
Applicatiecode mag nooit uit deze map laden. Zie `figma/README.md`.

### `rive/`

Conventies voor toekomstige animatiebronnen en builds. Rive is nog niet
geïnstalleerd en er worden nu geen `.riv`-bestanden bijgehouden. Zie
`rive/README.md`.

- Formaat: **WebP met transparante achtergrond**.
- Bestandsnamen: **lowercase kebab-case**.
  - Losse assets: `novi-<state>.webp`, `varo-<state>.webp`, `vera-<state>.webp`.
  - Family-assets: `family-<state>.webp`.
  - Een state met meerdere gelijkwaardige composities (varianten):
    `<character>-<state>-<n>.webp`, genummerd vanaf 1, met het aantal als
    `variants` in het register. Elke variant heeft hetzelfde canvas en
    dezelfde betekenis; het zijn geen versies.
- Aanwezig en geregistreerd:
  - Novi, Varo en Vera: alle tien states, via `PersonalMascot` in gebruik als
    persoonlijke gids (begroeting, oefening en uitslag, spel, ontdekken,
    lezen, lege en ruststatussen);
  - family: tien composities (zie "States voor family"), langste zijde
    1200 px met de verhouding van de bron (meest 1200x800, `huddle`
    1200x1200, `support` 1200x1000). In gebruik: `welcome` op de publieke
    homepage, `huddle` bij het welkom van de onboarding. De oudere
    welkomstbeelden (`versado-family-1` t/m `-4`) staan alleen nog als bron
    in `references/family/`.
- Niet in een bestandsnaam: `v1`, `v2`, `final` of synoniemen voor een
  bestaande state. Geen nieuwe states zonder bewuste ontwerpkeuze.
- Niet in de afbeelding: tekst, tekstballonnen of een achtergrond. Tekst
  komt altijd via de app-vertalingen.
- Bestaande `.gitkeep`-bestanden onder `static/` blijven staan. Maak voor
  toekomstige Rive-mappen geen lege structuur vooruit; documentatie is
  voldoende tot er een echt asset bestaat.

### States voor Novi, Varo en Vera

Functionele toestanden in Versado, geen willekeurige emoties. Alle drie de
gidsen hebben exact dezelfde tien states. Gebruik ze consequent met deze
betekenis (beschreven voor Novi; voor Varo en Vera geldt hetzelfde):

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

De familie is **geen persoonlijke gids** en heeft dus niet de tien
persoonlijke states. Persoonlijke momenten (goed antwoord, begroeting op
Vandaag, ...) blijven altijd de gekozen gids via `PersonalMascot`; de familie
is alleen voor bewust gedeelde Versado-momenten.

| state | betekenis | in gebruik |
|---|---|---|
| `welcome` | de algemene introductie van de drie samen | publieke homepage (en daarmee onder de vriendenuitnodiging) |
| `hero` | promotionele familieweergave | nog niet |
| `huddle` | compact gezamenlijk welkom | onboarding, eerste stap ("Welkom!") |
| `celebrate` | alleen een echt grote Versado-mijlpaal (cursus afgerond, promotie, lange reeks, belangrijk gezamenlijk spelmoment) | nog niet: zo'n scherm bestaat nog niet |
| `discovery` | samen iets ontdekken | nog niet |
| `learning` | samen leren of studeren | nog niet |
| `playing` | samen spelen | nog niet |
| `progress` | grotere voortgang of ontwikkeling | nog niet |
| `support` | gezamenlijke motivatie | nog niet |
| `rest` | rustige gezamenlijke eindstatus | nog niet |

Beloningshiërarchie, om beloningsinflatie te voorkomen: gewoon goed antwoord
→ persoonlijke `success`; groter individueel moment → persoonlijke
`celebrate`; echt grote Versado-mijlpaal → `family`/`celebrate`. Een state
die bestaat is geen reden om hem te gebruiken: alleen op een plek waar de
gedeelde betekenis echt klopt.

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

Conversie (voor de hele set gelijk): het bron-canvas (nu 1254x1254 voor
Novi, Varo en Vera) proportioneel naar 512 px langste zijde, met
voorvermenigvuldigde alfa (geen donkere randen), LANCZOS, WebP kwaliteit 88,
method 6, alpha_quality 100. Nooit opschalen en niet bijsnijden, zodat een
personage in elke pose even groot is. Controleer daarna per bestand: echte
WebP met alfakanaal, afmetingen, transparante hoeken, en randen op een lichte
en een donkere achtergrond. Pas daarna mag het bronbestand weg.

Pagina's verwijzen nooit rechtstreeks naar deze bestanden. Een persoonlijk
moment gebruikt `<PersonalMascot state="success" />`; contextueel beeld en de
familie gebruiken `MascotSlot` met een personage en state, bv.
`<MascotSlot character="family" state="welcome" />`
(`src/components/versado/MascotSlot.tsx`).

## Later: Rive

Als er later animatie (Rive) achter `MascotSlot` komt, blijven deze WebP's
gewoon in gebruik: als terugval bij `prefers-reduced-motion`, tijdens het
laden, bij een fout, op plekken waar beweging niets toevoegt, en op
apparaten of browsers waar animatie ongewenst is. Pagina's veranderen dan
niet; alleen de renderer in `MascotSlot` krijgt er een variant bij. Ook
`<PersonalMascot state="..." />` blijft dan ongewijzigd.
