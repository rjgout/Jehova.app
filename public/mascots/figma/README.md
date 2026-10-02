# Figma-assets

Deze map bevat geoptimaliseerde kopieën voor ontwerp, wireframes en mockups.
Het zijn **geen productie-assets**. Applicatiecode mag nooit uit
`/mascots/figma/` laden.

## Hiërarchie

- `../references/` is de visuele character-canon;
- `../static/` bevat de productie-assets voor de app;
- `./` bevat uitsluitend afgeleide ontwerpkopieën;
- `../rive/` documenteert de toekomstige animatiebron en builds.

Gebruik alleen goedgekeurde productie-assets als bron voor exports. Voor
Novi bevat iedere state waar mogelijk twee formaten:

- `novi/512/novi-<state>.webp`: langste zijde maximaal 512 px;
- `novi/256/novi-<state>.webp`: langste zijde maximaal 256 px.

De langste zijde wordt nooit boven de bronresolutie vergroot. Exports houden
de oorspronkelijke verhouding en alpha-transparantie, zonder crop,
hercompositie of kleurwijziging.

De huidige Novi-exports zijn reproduceerbaar gemaakt als volgt:

- 512: byte-identieke kopie van het officiële static bestand, omdat de bron
  al 512 px breed is;
- 256: ImageMagick 6, Lanczos, `-resize '256x256>'`, WebP-kwaliteit 88,
  methode 6 en alpha-kwaliteit 100.

Daarmee worden de huidige canvassen van 512×468 naar 256×234 geschaald.

## Ontwerpregels

- verander kleuren, markeringen en verhoudingen niet;
- maak geen eigen crops of alternatieve Novi-versies;
- rek of vervorm een asset nooit;
- schalen met vergrendelde aspect ratio is toegestaan;
- gebruik altijd `docs/VERSADO-CHARACTER-CANON.md` en de goedgekeurde
  referenties;
- een Figma-export wordt nooit terug de productiecode in gekopieerd.

Nieuwe Varo- en Vera-kopieën volgen later dezelfde conventie onder
`figma/varo/` en `figma/vera/`, pas nadat officiële productie-assets bestaan.
