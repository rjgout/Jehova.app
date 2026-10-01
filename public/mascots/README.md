# Versado mascotte-assets

Deze map is de productie-ingang voor statische Versado-mascottes.

## Canon

De mascottes zijn één familie van fantasie-vos/lynxachtige Versado-wezens: donker/navyblauw dominant, crème snuit/borst/buik, herkenbare oranje accenten, grote puntige oren, expressieve ogen en een pluimstaart. De drie personages moeten onmiddellijk als dezelfde soort/familie herkenbaar zijn, maar ieder een eigen silhouet houden.

**Novi** is de kleine avonturier: vrolijk, energiek, nieuwsgierig en ondeugend. Zijn visuele rol is spelen en experimenteren. Een kleine rugzak of speels ontdekvoorwerp mag voorkomen wanneer de activiteit daarom vraagt, maar accessoires zijn nooit verplicht. Novi moet zonder accessoire herkenbaar blijven.

Gedragsprincipe voor alle mascottes: **“Ik ontdek dit samen met jou.”** Ze staan niet als leraar boven de gebruiker. Bij een fout antwoord reageren ze aanmoedigend, nooit teleurgesteld of bestraffend.

## Bestandssysteem

We beginnen bewust alleen met Novi. Voeg Varo en Vera pas toe wanneer hun eigen implementatiefase start.

Productie-assets:
```
public/mascots/static/novi/
```

Naamgeving:
```
novi-<state>.webp
```

Toegestane states:
- `idle`
- `greeting`
- `thinking`
- `discovery`
- `reading`
- `playing`
- `success`
- `encourage`
- `celebrate`
- `sleep`

Voorbeelden:
```
novi-idle.webp
novi-greeting.webp
novi-playing.webp
novi-celebrate.webp
```

Gebruik lowercase kebab-case. Geen versienummers, beschrijvende synoniemen of alternatieve state-namen.

## Eisen aan statische bestanden

- WebP voor productie.
- Transparante achtergrond.
- Geen tekst, kader, ingebakken achtergrond of tekstballon.
- Houd rond het personage voldoende transparante marge; niets onbedoeld afsnijden.
- De character sheet en goedgekeurde Novi-assets zijn de visuele bron van waarheid. Nieuwe poses mogen Novi niet opnieuw interpreteren.
- Proporties, gezicht, vachtpatroon, kleuren, oorvorm, staart, leeftijd/maat en algemene renderingstijl moeten tussen alle assets consistent blijven.
- Accessoires alleen wanneer de pose/activiteit ze functioneel nodig heeft.
- Een state beschrijft de functie in de app, niet alleen een gezichtsuitdrukking.

Bewaar originele hoge-resolutiebronbestanden buiten deze productie-map. Productie-WebP's zijn exports, niet de enige masters.

## Integratie

Pagina's en features verwijzen **nooit rechtstreeks** naar een bestandspad uit deze map. Alle mascotteweergave loopt via `src/components/versado/MascotSlot.tsx`.

Goed:
```tsx
<MascotSlot character="novi" state="greeting" />
```

Niet doen:
```tsx
<img src="/mascots/static/novi/novi-greeting.webp" />
```

Een ontbrekende state rendert voorlopig niets; gebruik geen tijdelijke emoji, stockillustratie of andere mascotte als fallback.

## Voorbereiding op Rive

De statische WebP's hoeven niet zelf rigbaar te zijn. Ze blijven later bruikbaar als fallback en voor plekken waar animatie niet nodig is.

De API van `MascotSlot` gebruikt semantische `character + state`-waarden en mag niet afhankelijk worden van WebP-bestandsnamen. Wanneer Rive later wordt toegevoegd, vertaalt dezelfde component deze states naar een Rive state machine. Bestaande pagina's mogen daarvoor niet opnieuw hoeven worden opgebouwd.

Rive wordt nu nog niet geïnstalleerd en er worden nu nog geen `.riv`-placeholders toegevoegd.
