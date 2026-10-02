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
Novi, Varo en Vera bevat iedere state twee formaten:

- `<personage>/512/<personage>-<state>.webp`: langste zijde maximaal 512 px;
- `<personage>/256/<personage>-<state>.webp`: langste zijde maximaal 256 px.

De langste zijde wordt nooit boven de bronresolutie vergroot. Exports houden
de oorspronkelijke verhouding en alpha-transparantie, zonder crop,
hercompositie of kleurwijziging.

De huidige exports zijn reproduceerbaar gemaakt als volgt:

- 512: byte-identieke kopie van het officiële static bestand, omdat de bron
  al 512 px is;
- 256: Pillow, Lanczos met voorvermenigvuldigde alfa, WebP-kwaliteit 88,
  methode 6 en alpha-kwaliteit 100.

Daarmee worden de huidige canvassen van 512×512 naar 256×256 geschaald.
`npm run test:mascots` controleert dat de 512-kopieën byte-identiek zijn en
dat de 256-exports de verhouding behouden.

## Ontwerpregels

- verander kleuren, markeringen en verhoudingen niet;
- maak geen eigen crops of alternatieve Novi-versies;
- rek of vervorm een asset nooit;
- schalen met vergrendelde aspect ratio is toegestaan;
- gebruik altijd `docs/VERSADO-CHARACTER-CANON.md` en de goedgekeurde
  referenties;
- een Figma-export wordt nooit terug de productiecode in gekopieerd.
