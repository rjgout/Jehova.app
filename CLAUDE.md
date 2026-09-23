# CLAUDE.md

Instructies voor Claude Code bij het werken aan dit project. Voor
functionaliteit/features: zie `README.md`. Voor een uitgewerkt
deployvoorbeeld: zie `docs/DEPLOY-SYNOLOGY.md`.

## Wat dit is

**Jehova** — een algemene, interactieve leeromgeving voor schriftstudie
(lessen, oefeningen, XP, streaks, competitie, live multiplayer-quiz). Het
datamodel (`Book`/`Chapter`/`Verse`/`Course`, zie Database & migraties
hieronder) is bewust niet aan één specifiek schriftwerk gebonden: het Boek
van Mormon is vandaag de enige/eerste cursus/contentcollectie, maar de
architectuur staat toe dat er later andere collecties bijkomen (bv. de Leer
en Verbonden of de Parel van Grote Waarde) zonder herbouw. "Geloof je dat
ook?" is de naam van de meegeleverde podcastcursus (zie
`prisma/podcastContent.ts`) — een aparte contentbron binnen de app, niet de
naam of technische identiteit van de app zelf (zie `src/lib/brand.ts`).
Bewust gebouwd om **self-hosted** te draaien (geen
cloud-platformafhankelijkheden), taal is overal Nederlands (UI, foutmeldingen,
codecommentaar, commitmessages). De huidige Nederlandstalige wekelijkse
competitie is gekoppeld aan de huidige Nederlandstalige content — zie
`LeagueSettings.localeCode` in `prisma/schema.prisma`, dat een toekomstige
tweede taal/competitie niet blokkeert.

Nieuwe code, teksten of bestandsnamen mogen "Boek van Mormon"/"BOM" dus
alleen gebruiken waar dat feitelijk over de huidige content gaat (bv. een
importscript voor die content, of een featurebeschrijving die vandaag klopt)
— nooit als aanname dat de hele app daarom draait. Zie ook de sectie
"Podcastafleveringen verwerken" hieronder voor hoe dat onderscheid in de
praktijk toegepast wordt.

## Werkwijze

- Bij een vraag om analyse, ontwerp of sparren: wijzig geen code tenzij daar
  expliciet om wordt gevraagd.
- Bij grotere wijzigingen: onderzoek eerst de relevante bestaande
  implementatie en doe een concreet voorstel voordat je code wijzigt.
- Stel alleen verduidelijkende vragen wanneer benodigde informatie niet uit
  het project of de opdracht kan worden afgeleid.
- Maak geen ongevraagde refactors of wijzigingen buiten de scope van de taak.
- Lees aanvullende documentatie alleen wanneer die relevant is voor de
  huidige taak. Scan niet standaard het volledige project of alle bestanden
  onder `docs/`.
- Begin bij de bestanden die direct bij de taak horen en volg
  imports/referenties wanneer meer context nodig is.

## Techstack

- Next.js 16 (App Router) + TypeScript (strict) + Tailwind CSS + React 19
- PostgreSQL + Prisma (migrations in `prisma/migrations/`)
- Redis + `@socket.io/redis-adapter` voor de live multiplayer-quiz
- Custom server (`server.ts`, via `tsx`, geen `next start`) omdat er een
  Socket.io-server naast de Next.js-requesthandler moet draaien
- Auth: eigen implementatie — `jose` (JWT) + `bcryptjs`, geen NextAuth/Clerk/etc.
- **Geen testframework aanwezig** (geen jest/vitest/playwright-dependency,
  geen test-CI-stap) — zie de validatiestappen onderaan dit bestand.

## Architectuur (3 containers, zie `docker-compose.yml` / `README.md`)

| Container | Rol | Persistent? |
|---|---|---|
| `jehova-app` | Next.js-app + API + Socket.io-server (`server.ts`) | Nee, stateless |
| `jehova-db` | PostgreSQL — alle gebruikersdata | Ja (`jehova_db_data`) |
| `jehova-redis` | Socket.io-adapter voor live-quiz | Nee, ephemeral |

Containernamen zijn puur infrastructuur, geen productbranding — de
Postgres-gebruiker/database heten bewust nog "bom" (zie `.env.example`),
dat is voor niemand zichtbaar en hoeft niet mee te veranderen.

Build/deploy: GitHub Actions bouwt bij elke push naar `main` een image en
publiceert 'm naar `ghcr.io` (`.github/workflows/docker-publish.yml`); een
zelfgehoste instantie haalt 'm op via Portainer/Docker Compose. Zie
`docs/DEPLOY-SYNOLOGY.md` voor de migratienotitie als je van een oudere
`bom-game`-naamgeving komt.

## ⚠️ Harde regel: `server.ts`'s eager-importketen

`server.ts` importeert `src/server/gameServer.ts` en `src/lib/scheduler.ts`
**bovenaan het bestand, vóór `app.prepare()`** — dus vóórdat Next zelf
geïnitialiseerd is, en dat draait via `tsx` (buiten Next's eigen
module-bundeling om). Elke module die transitief via die twee bestanden
meekomt (o.a. `notify.ts`, `baseUrl.ts`, `streak.ts`, `challenges.ts`,
`scrabbleGame.ts`) mag daarom **nooit** een runtime-import bevatten van een
request-scoped Next-API (`next/headers`, `cookies()`/`headers()` uit
`next/server` als waarde, etc.) — dat crasht het hele productieproces bij
opstarten met `Invariant: AsyncLocalStorage accessed in runtime where it is
not available` (in een crash-lus, dus de container komt nooit gezond op).
Zulke APIs zijn alleen veilig in bestanden die uitsluitend via Next's eigen
bundeling geladen worden: `page.tsx`/`layout.tsx`/`route.ts`-bestanden en
alles wat **alleen** daar vandaan geïmporteerd wordt (bv. `session.ts`,
gebruikt via routes, nooit via `server.ts`'s eigen keten).
Controleer bij twijfel: `grep -rn "next/headers" src/lib src/server server.ts`
— hoort leeg te zijn buiten route/page/layout-bestanden.

## Projectstructuur

- `server.ts` — custom entrypoint (HTTP-server + Next-handler + Socket.io)
- `src/server/gameServer.ts` — Socket.io-logica voor live multiplayer (lobby,
  scores, "Raad het hoofdstuk"); state van een lopend spel leeft in-memory
  in deze ene instantie (zie Beperkingen in `README.md`)
- `src/app/**` — App Router: pagina's (`page.tsx`) + API-routes (`app/api/**/route.ts`)
- `src/lib/**` — kernlogica, georganiseerd per domein; vermijd onnodige
  versnippering (`streak.ts`, `xp.ts`, `leagues.ts`, `competitionXp.ts`,
  `challenges.ts`, `scrabbleGame.ts`, `chapterGuess.ts`, `wordGame.ts`,
  `notify.ts`, `email.ts`, `auth.ts`, `session.ts`, `baseUrl.ts`, `dates.ts`, ...)
- `src/components/**` — client components (`"use client"`), meestal één
  `<Feature>Client.tsx` per pagina die de eigen data fetcht
- `prisma/schema.prisma` + `prisma/migrations/**` — datamodel en migraties
- `prisma/seed.ts`, `import.ts`, `importKids.ts`, `importPodcast.ts` — content laden
- `deploy/`, `docs/DEPLOY-SYNOLOGY.md` — self-host-referentiedeploy (Synology + Portainer)

## Database & migraties

- Eén `PrismaClient`-singleton in `src/lib/db.ts` (standaard Next-hot-reload-guard).
- **Migratiebeleid (hard, consistent toegepast)**: een nieuwe migratie mag
  bestaand gedrag/data van bestaande gebruikers nooit met terugwerkende
  kracht veranderen. Nieuwe verplichte/gedrag-bepalende kolommen krijgen in
  dezelfde migratie een backfill (raw SQL) die ze zo vult dat bestaande
  gebruikers het nieuwe gedrag NIET automatisch triggeren (bv.
  `onboardingSeenAt = createdAt` zodat bestaande accounts de onboarding-flow
  nooit alsnog te zien krijgen). Patroon: DDL bovenaan `migration.sql`,
  backfill-`UPDATE`/`INSERT...SELECT` eronder, in hetzelfde bestand.
- Instellingen die een admin via `/adminbackend` aanpast staan in eigen
  singleton-modellen (`id String @id @default("singleton")`) — patroon:
  `EmailSettings`, `LeagueSettings`, `BrandingSettings`, `DetectedAppUrl`.
  Geheimen (SMTP-wachtwoord) staan versleuteld (`src/lib/crypto.ts`, sleutel
  afgeleid van `SESSION_SECRET`), nooit als platte tekst.
- In deze devcontainer: Postgres/Redis starten niet vanzelf, en
  `prisma migrate dev` kan hier "non-interactive environment"-fouten geven —
  gebruik dan `--create-only` (schrijft alleen het SQL-bestand) of schrijf
  `migration.sql` handmatig volgens het patroon hierboven, en pas toe met
  `prisma migrate deploy`.

## Auth & autorisatie

- Sessie = httpOnly JWT-cookie (`bvm_session`, `jose`, 30 dagen), wachtwoorden
  gehasht met `bcryptjs`. Geen aparte rollen-tabel: alleen `User.isAdmin`.
- **De allereerste ECHTE registratie op een verse installatie wordt
  automatisch admin** (geen setup-stap nodig); demo-accounts uit
  `SEED_DEMO_USERS`/`prisma/seed.ts` tellen daar bewust niet voor mee.
- Elke API-route/server-actie die auth nodig heeft begint met
  `getCurrentUser()` (uit `src/lib/session.ts`) → 401 bij `null` → bij
  admin-routes daarna ook `isAdmin` → 403. Er is geen `middleware.ts`; elke
  route/pagina controleert dit zelf.
- Gebruikersidentiteit is `handle#discriminator` (bv. `Jan#83`, zie
  `src/lib/handle.ts`) — privacyvriendelijk, iedereen kan dezelfde
  weergavenaam kiezen, e-mailadres hoeft nooit gedeeld te worden.
  Vindbaarheid via e-mailadres is een losse, standaard-uit instelling
  (`User.searchableByEmail`).

## API- en servercode-conventies

- Route handlers: `NextRequest`/`NextResponse`, invoer gevalideerd met `zod`,
  fouten als `NextResponse.json({ error: "<Nederlandse boodschap>" }, { status })`.
- **Server is de enige bron van waarheid voor XP/scores/spelstatus** — de
  client stuurt nooit een bedrag of resultaat, de server berekent en
  valideert alles opnieuw (zie elke `complete*`-functie in `streak.ts`,
  `scrabbleGame.ts`, `gameServer.ts`). Zie `src/lib/xp.ts` en
  `src/lib/competitionXp.ts` voor de implementatiedetails (o.a. concurrency-
  veilige tegoeden en anti-farming-regels voor competitie-XP).
- E-maillinks: gebruik `getBaseUrl(req)` (uit een route met een `NextRequest`)
  of `getAppUrl()` (async, overal elders — schedulers, socket-server) uit
  `src/lib/baseUrl.ts`. Beide zijn domeinonafhankelijk (geen hardcoded
  localhost/domein) — zie de harde regel hierboven voor de valkuil daarbij.
- E-mail is optioneel en admin-configureerbaar (`/adminbackend`, generieke
  SMTP); check altijd `isEmailConfigured()` voordat je een flow laat
  blokkeren op e-mail — zonder configuratie moet de app blijven werken.
- **Keuzeopties van oefeningen altijd geschud tonen, nooit de opslagvolgorde
  direct.** Voor automatisch gegenereerde hoofdstukoefeningen
  (`src/lib/exerciseGen.ts`) gebeurt dit al bij het genereren zelf
  (`shuffleWithSeed`). Voor handmatig geschreven content (introcursus,
  kindercursus, podcast, en toekomstige vergelijkbare content) staan
  `options`/`wordBank` in de database in de volgorde waarin ze getypt zijn —
  in de praktijk vaak "het juiste antwoord eerst" of (bij WORD_BANK/SEQUENCE)
  zelfs al helemaal in de juiste volgorde. Haal daarom bij het samenstellen
  van een `Exercise` voor de client altijd `options`/`wordBank` door
  `shuffleForDisplay()` (ook in `src/lib/exerciseGen.ts`) — puur presentatie,
  geen seed nodig, want antwoorden worden op tekst gecontroleerd, nooit op
  positie (zie `isExerciseCorrect`).

## Content-API (`/api/content-api/*`)

Losstaande, sleutel-beveiligde route-namespace zodat Claude Code (of een
ander extern proces) live contentstatus kan uitlezen zonder in te loggen —
bedoeld voor workflows als "check of er nieuwe content klaarstaat om te
verwerken". Fundamenteel anders dan de rest van de API:

- **Auth**: geen cookie-sessie, maar een vaste sleutel in de
  `X-API-Key`-header, gecontroleerd met `verifyContentApiKey()` in
  `src/lib/contentApi.ts` tegen de env var `CONTENT_API_KEY` (constant-time
  vergelijking, zie die functie voor waarom). Geen env var gezet = de hele
  namespace retourneert altijd 401 — nooit "open" bij ontbrekende configuratie.
- **Scope, hard begrensd**: uitsluitend content (`Book`/`Chapter`/`Verse`,
  `Course`, `IntroLesson`, `PodcastEpisode`, `KidsStory`, `Person`/`Place`/
  `Topic`, en vergelijkbare content-modellen uit `prisma/schema.prisma`).
  **Nooit** gebruikers-, activiteit- of persoonsgegevens (dus niets uit
  `User`, `Friendship`, `LiveGame`, `WeeklyScore`, `Feedback`, enz.) — dat
  blijft uitsluitend via de gewone, sessie-beveiligde routes lopen. Twijfel
  je of een veld hieronder valt: dan hoort het er niet in.
  - `GET /api/content-api/status`: eerste endpoint, telt alleen aantallen
    per content-tabel. Dient als sjabloon voor nieuwe, specifiekere routes
    in dezelfde namespace (zelfde `verifyContentApiKey`-check bovenaan,
    zelfde "alleen content"-grens).
- **Alleen lezen vooralsnog.** Nieuwe content plaatsen gebeurt nog steeds
  via de bestaande weg: een TS-object toevoegen aan het relevante
  seed-bestand (bv. `prisma/podcastContent.ts`), `npx tsc --noEmit`, committen
  naar de werkbranch — zie "Podcastafleveringen verwerken" hieronder. Een
  schrijvende content-API-route (bv. om die stap te automatiseren) is een
  bewuste, aparte vervolgstap — niet zomaar aannemen dat die er al is.

## Codestijl

- Commentaar in het Nederlands, en legt **waarom** uit (niet-vanzelfsprekende
  aannames, edge cases, bewuste afwegingen) — nooit **wat** de code doet.
- Commitmessages zijn in het Nederlands en beschrijven duidelijk wat er is
  gewijzigd en waarom wanneer dat relevant is.
- Geen ORM-modelduplicatie in aparte typebestanden: types komen uit
  `@prisma/client` of worden lokaal in het bestand zelf gedefinieerd.
- **Geen merknamen in zichtbare/leesbare tekst.** Een feature mag intern
  geïnspireerd zijn op een bekend concept (bv. een woordraadspel, een
  asynchroon bordspel), maar de naam van dat bekende merk/product hoort
  nooit in UI-tekst, documentatie of codecommentaar terecht te komen (bv.
  niet "Wordle-stijl" of "net als Wordfeud") — beschrijf het mechanisme zelf
  in plaats daarvan. Interne codenamen (bestandsnamen, functie-/modelnamen)
  zijn hierop de uitzondering: die omdopen is een aparte, grotere refactor
  en levert gebruikers niets op, dus dat gebeurt niet automatisch mee.
- **Een `bg-`/`border-`-kleur overschrijven op een element met `.card`/`.btn`/
  `.btn-primary`/`.btn-secondary`/`.input` (globals.css) moet altijd met een
  `!`-prefix** (bv. `!bg-gold-50 dark:!bg-slate-800 !border-gold-400/30`).
  Die basisklassen staan in de gecompileerde CSS ná Tailwinds eigen
  utility-laag (ze zijn plain CSS, niet via `@layer components`), dus zonder
  `!` wint `.card`'s eigen `bg-white`/`border-slate-100` alsnog ondanks
  gelijke specificiteit — de kleur ziet er in de JSX uit alsof die klopt,
  maar rendert gewoon wit/de standaardkleur. Alleen `bg-gradient-to-br`
  (een ander CSS-veld, `background-image`) en pseudo-class-varianten zoals
  `hover:` (hogere specificiteit) zijn hier vanzelf immuun voor. Controleer
  bij twijfel met `getComputedStyle(el).backgroundColor` in de browser, niet
  alleen visueel — het verschil tussen wit en een lichte tint (bv. gold-50)
  is op een screenshot makkelijk te missen.

## Content & auteursrecht (relevant bij wijzigingen aan content/seeds)

- `prisma/content.ts` bevat **geen** letterlijke Boek van Mormon-tekst — dat
  is auteursrechtelijk beschermd. Alleen zelfgeschreven parafrases als demo.
  Echte content laden kan via `npm run db:import` (eigen, apart geregelde bron).
- De kindercursus-tekst/illustraties ("Verhalen uit het Boek van Mormon")
  worden met toestemming gebruikt — deel dit dus niet als losstaand
  bestand/export met een instantie die die toestemming niet apart heeft.

## Podcastafleveringen verwerken (`prisma/podcastContent.ts`)

Wanneer de eigenaar nieuwe `.vtt`-transcripten van "Geloof je dat ook?"
aanlevert (bv. in een `VTT/`-map) om te verwerken tot leeroefeningen:

- **Structuur per aflevering** (zie bestaande entries in
  `prisma/podcastContent.ts` als voorbeeld): 4-5 `content`-oefeningen
  (MULTIPLE_CHOICE/TRUE_FALSE/SEQUENCE) die gaan over wat er **daadwerkelijk**
  in dat specifieke gesprek besproken wordt — geen generieke vragen — plus
  4 `bomConnection`-oefeningen die het gesprek verbinden aan één concreet,
  geverifieerd hoofdstuk/vers uit het Boek van Mormon. Sluit beide blokken
  af met een SEQUENCE-oefening.
- **`title`/`summary`**: gebruik altijd de placeholders
  `title: "Aflevering N"` en
  `summary: "Wordt bijgewerkt vanuit de podcastfeed."` — `syncPodcastFeed()`
  in `src/lib/podcastFeed.ts` overschrijft deze velden toch bij elke sync
  vanuit de RSS-feed, dus een eigen titel/samenvatting schrijven heeft geen zin.
- **Transcript lezen**: een `.vtt`-bestand bevat WebVTT-timestamps en
  `<v Speaker>`-tags; lees het gesprek inhoudelijk (wie zegt wat) in plaats
  van te parsen op basis van de cue-nummers/tijden.
- **BOM-verbinding kiezen en verifiëren**: zoek een hoofdstuk/passage die
  **inhoudelijk** aansluit bij het onderwerp van het gesprek (niet een
  toevallige losse zin), en haal de **exacte** Nederlandse verstekst op uit
  `prisma/bomContent.json` (bv. via een kort `python3 -c "..."`-scriptje) —
  nooit uit het geheugen citeren, parafrases moeten letterlijk kloppen met
  de brontekst.
- Vermijd bewust gevoelige/uit-context-provocerende passages als
  BOM-connectie (bv. "de grote en gruwelijke kerk" uit 1 Nephi 13) tenzij
  het gesprek daar expliciet over gaat.
- Varieer BOM-hoofdstukken zoveel mogelijk over de afleveringen heen;
  incidenteel hergebruik van eenzelfde hoofdstuk mag, mits met duidelijk
  andere verzen/thema en alleen als dat aantoonbaar de beste match is.
- Werk **per aflevering** dit patroon af: transcript lezen → onderwerpen
  bepalen → BOM-tekst zoeken en verifiëren → TS-object toevoegen aan het
  array → `npx tsc --noEmit`. Commit per 1-3 afleveringen naar de
  werkbranch (nooit rechtstreeks naar `main`).
- **Afsluitende validatie** nadat alle afleveringen zijn toegevoegd:
  `npx tsc --noEmit`, een lokale import-test tegen een Postgres-instantie
  (roep `importPodcastEpisodes()` uit `prisma/importPodcast.ts` rechtstreeks
  aan met `podcastEpisodes`, niet de volledige `runSeed()`, want die roept
  ook `syncPodcastFeed()` aan die een netwerkverzoek naar de echte RSS-feed
  doet), controleer dat elke aflevering het verwachte aantal oefeningen
  heeft, ruim de testdata daarna weer op, en tot slot
  `rm -rf .next && npm run build`.

## Lokaal ontwikkelen

```bash
npm install
npm run db:migrate:deploy   # of db:push tijdens actieve schema-iteratie
npm run db:seed
npm run dev                 # tsx server.ts, vereist een lokale/bereikbare Postgres + Redis
```

Belangrijke env vars (zie `.env.example`): `DATABASE_URL`, `REDIS_URL`,
`SESSION_SECRET`, `ALLOW_INSECURE_COOKIES` (alleen voor http-LAN-testen),
`SEED_DEMO_USERS`, `APP_URL` (optioneel, anders auto-detectie uit het
verzoek), `PODCAST_FEED_URL` (optioneel). SMTP wordt niet via env
geconfigureerd maar via `/adminbackend` in de app zelf.

Vóór een taak als afgerond geldt: voer `npx tsc --noEmit` uit, test relevante
functionaliteit waar mogelijk handmatig via de dev-server/API, en voer
daarna een schone productiebuild uit met `rm -rf .next && npm run build`.


## Versiebeheer

Jehova.app bevindt zich momenteel in een intensieve beta-fase. Er zullen nog veel kleine bugfixes en verbeteringen plaatsvinden. Daarom vertegenwoordigt een versienummer een release en niet iedere individuele wijziging of deployment.

- Gebruik `package.json` als enige bron van waarheid voor de applicatieversie.
- De huidige beta-versie blijft op `0.x.0`-niveau; verhoog het versienummer alleen bewust voor een nieuwe release met relevante gebruikersgerichte wijzigingen.
- Verhoog de versie niet automatisch bij iedere commit, bugfix of deployment.
- Gebruik de Git commit SHA als technische build-identificatie. De combinatie van applicatieversie en korte SHA moet exact aangeven welke code gedeployed is.
- Toon de versie in de profiel-/informatieomgeving als bijvoorbeeld `v0.1.0 · beta · build abc1234`.
- Houd een `CHANGELOG.md` bij voor belangrijke gebruikersgerichte wijzigingen en releases. Registreer niet iedere kleine interne bugfix als aparte release.
- Gebruik `1.0.0` pas voor de eerste stabiele release.
- Houd het systeem eenvoudig zolang Jehova.app beta is; voeg geen complex release-management toe zonder concrete behoefte.


## Verificatie- en wijzigingsdiscipline

Dit project heeft eerder problemen gehad doordat meerdere kleine wijzigingen achter elkaar
werden gemaakt zonder tussentijds de volledige TypeScript/build-status te controleren. Dat
mag niet opnieuw gebeuren.

- **Een wijziging is pas klaar als de code ook aantoonbaar compileert.** Na iedere wijziging
  aan TypeScript/TSX moet minimaal `npx tsc --noEmit` worden uitgevoerd voordat een volgende
  gerelateerde codewijziging wordt gemaakt.
- Na een reeks wijzigingen aan één feature moet altijd een **schone productiebuild** worden
  uitgevoerd: `rm -rf .next && npm run build`. Alleen een groene GitHub Actions-build telt
  als bevestiging dat de gepushte commit daadwerkelijk door de productiebuild komt; als de
  workflow nog niet gestart is, mag niet worden gezegd dat de build geslaagd is.
- **Geen fout-op-fout stapelen.** Als een wijziging een compileerfout veroorzaakt, stop dan
  met nieuwe wijzigingen en los eerst de eerste fout op. Controleer daarna opnieuw met
  `npx tsc --noEmit`. Voeg geen tweede of derde "fix" toe op basis van aannames.
- Controleer na iedere wijziging de volledige gewijzigde functie/imports in de actuele versie
  van het bestand. Let vooral op imports die bij een eerdere wijziging zijn toegevoegd,
  verwijderd of verplaatst. Een ongebruikte import is vervelend, maar een gebruikte functie
  zonder import is een build-blocker.
- **Vertrouw niet op een eerdere claim dat iets werkt.** Controleer de actuele branch, de
  actuele commit en de actuele build-status zelf voordat je een volgende wijziging maakt of
  zegt dat iets klaar is.
- Bij meerdere samenhangende wijzigingen: werk eerst de implementatie uit, voer daarna de
  TypeScript-check uit, en maak pas daarna een volgende wijziging. Houd commits zo klein dat
  een fout direct aan één concrete wijziging te koppelen is.
- Als GitHub Actions meerdere rode commits laat zien, behandel die niet als afzonderlijke
  problemen zonder de logs te bekijken. Zoek eerst de **eerste inhoudelijke fout** en bepaal
  welke latere commits daarvan afhankelijk zijn. Repareer de onderliggende oorzaak in plaats
  van steeds een nieuwe workaround erbovenop te zetten.
- Voor een bugfix geldt: reproduceer of lokaliseer eerst de fout in de actuele code, lees de
  relevante bestaande implementatie en wijzig daarna zo minimaal mogelijk. Niet gokken,
  niet "blind" een import toevoegen of verwijderen omdat een foutmelding dat oppervlakkig
  lijkt te suggereren.
