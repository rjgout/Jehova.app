# Versado-mascottes: productie-assets

Deze map bevat alleen **geoptimaliseerde productie-assets** van de
Versado-mascottes. Originele hoge-resolutiebestanden en mastergeneraties
horen hier niet. Bewaar ze apart: ze zijn de bron om later opnieuw te
exporteren of naar animatie (Rive) over te zetten.

De achtergrond, het karakter (de canon) en de afspraken staan in
`docs/VERSADO-DESIGN.md` onder "Mascottes".

## Stand

- **Novi** wordt als eerste uitgerold, met statische afbeeldingen.
- **Varo en Vera** volgen later. Voeg hun bestanden nu nog niet toe.
- Er is nog geen Rive. Voeg geen `.riv`-bestanden toe.

## Structuur en naamgeving

```
public/mascots/
  README.md
  static/
    novi/
      novi-<state>.webp
```

- Formaat: **WebP met transparante achtergrond**.
- Naam: precies `novi-<state>.webp`, in kleine letters (kebab-case).
- Toegestane states (functionele toestanden in Versado, geen willekeurige
  emoties):

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

- Niet in een bestandsnaam: `v1`, `v2`, `final` of synoniemen voor een
  bestaande state. Geen nieuwe states zonder bewuste ontwerpkeuze.
- Niet in de afbeelding: tekst, tekstballonnen of een achtergrond. Tekst
  komt altijd via de app-vertalingen.

## Een afbeelding toevoegen

1. Zet het bestand in `static/novi/` met de juiste naam, bv.
   `static/novi/novi-greeting.webp`.
2. Registreer het in `src/lib/mascots.ts` (`STATIC_ASSETS.novi`) met de
   afmetingen van het bestand, bv. `greeting: { width: 512, height: 512 }`.
   Een state die niet geregistreerd is, toont nergens iets.
3. Draai `npm run test:mascots`. Die controleert dat elk geregistreerd
   bestand bestaat en dat elk bestand in deze map een geldige naam heeft.

Pagina's verwijzen nooit rechtstreeks naar deze bestanden. Ze gebruiken
alleen `<MascotSlot character="novi" state="greeting" />`
(`src/components/versado/MascotSlot.tsx`).
