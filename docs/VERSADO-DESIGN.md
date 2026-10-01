# Versado: ontwerp- en architectuurrichting

Dit document legt vast waar de app naartoe gaat. Het is bedoeld voor iedereen
die aan de code werkt, mensen en AI-agents. **Lees het vóór je iets aan
navigatie, dashboard, lay-out, beeld of onboarding verandert.**

De app (repository `Jehova.app`, technische namen nog vaak `jehova`/`bom`)
heet voortaan **Versado**. Er komt een omvangrijk visueel redesign op basis
van Figma-ontwerpen en nieuwe beeldassets. Dat redesign gaat in fasen; zie
"Stand van de uitvoering" hieronder voor wat al gebouwd is. Dit document
beschrijft de richting, de huidige stand en de aandachtspunten; het is geen
ontwerp.

Voor alles wat nog niet in een fase is opgepakt, geldt:

- Geen visueel redesign en geen vervanging van bestaande schermen.
- Geen nieuw dashboard, geen nieuwe navigatie en geen tijdelijke visuele stijl
  op eigen initiatief.
- Geen tijdelijke mascottes, AI-afbeeldingen, stockfoto's of emoji-mascottes
  om ontbrekende assets op te vullen. Waar een plek technisch nodig is: een
  neutrale placeholder die later eenvoudig te vervangen is.
- Bestaande werkende functionaliteit gaat altijd voor op cosmetische
  wijzigingen. Niets verwijderen omdat het niet in de nieuwe hoofdnavigatie
  genoemd wordt.

## Stand van de uitvoering

**Fase 1 (app-shell en Vandaag) is gebouwd.** Leren, Spelen, Vrienden,
Competitie, Activiteit en Profiel zijn nog niet herontworpen; daar geldt de
lijst hierboven nog volledig.

- **Semantische tokens**: CSS-variabelen `--vs-*` in `src/app/globals.css`
  (licht op `:root`, donker op `.dark`, gelaagd en niet puur zwart), in
  Tailwind beschikbaar als kleurgroep `vs` (`bg-vs-surface`, `text-vs-fg-3`,
  `border-vs-line`, `text-vs-xp`, ...). Tekstcontrast is gecontroleerd op
  minimaal 4,5:1. Nieuwe schermen gebruiken deze tokens, geen losse
  `slate`/`brand`-kleuren.
- **Beweging**: zet `vs-motion` op een container; onder
  `prefers-reduced-motion` staan transities en animaties daarbinnen dan stil.
  `vs-rise` is een rustige binnenkomst, `vs-scroller` verbergt de scrollbalk
  van een veegrij.
- **Iconen**: `lucide-react`. Geen emoji als structureel icoon.
- **Shell**: vier hoofdbestemmingen in `src/lib/navigation.ts`
  (`PRIMARY_NAV`, met per bestemming de routes die erbij horen);
  `BottomNav.tsx` op telefoon en tablet, `shell/PrimaryNav.tsx` op desktop,
  `shell/SocialTabs.tsx` als tabs tussen `/friends`, `/competition` en
  `/activity`, en `shell/HeaderAvatar.tsx` als ingang naar het profiel. Reeks,
  XP en divisie staan in `NavUserBadges.tsx`. Alle bestaande routes werken
  ongewijzigd.
- **Terug en scrollen**: één centrale laag, geen code per pagina.
  Detailpagina's krijgen hun kop ("← Titel", optioneel een ondertitel) uit
  `SubpageBackBar.tsx` (lijst van pagina's met titel en terugval). De pijl
  werkt als de terugknop van de browser (`useBackNavigation` in
  `src/lib/navigationHistory.ts`); alleen zonder vorige pagina in de app
  (deeplink) gaat hij met replace naar de terugval. `shell/NavigationScroll.tsx`
  zet een nieuwe pagina bovenaan en herstelt bij terug/vooruit de oude
  positie (ook als de pagina zijn inhoud pas na het tonen ophaalt). Het
  venster is de scrollcontainer: zet `overflow` dus niet op `html` (zie
  `globals.css`). Onderdelen van het profiel hebben een eigen adres
  (`/profile?view=...`, `src/lib/profileViews.ts`).
- **Vandaag**: `src/app/dashboard/page.tsx` met de data uit
  `src/lib/today.ts` (`getTodayData`) en de blokken in
  `src/components/today/`. Gedeelde serverlogica staat in
  `activeGames.ts`, `courseSummaries.ts` en `gameCatalog.ts`, zodat de
  bestaande API-routes en Vandaag dezelfde bron gebruiken.
- **Beeld bij content**: `src/lib/artwork.ts` is de enige plek die weet
  welke afbeelding bij welke content hoort (register plus helpers die per
  cursus, boek, podcast of spel sleutels geven, van specifiek naar
  algemeen). Bestanden staan in `public/images/`, zonder tekst erin;
  `versado/MediaArtwork.tsx` toont ze via `next/image` (WebP per
  schermbreedte, vaste verhouding, gemiddelde kleur tijdens laden, neutrale
  placeholder met icoon als er geen beeld is of het niet laadt). Beeld
  hoort inhoudelijk bij de content: een cursus toont het boek waar je bent
  (of het beginboek als die cursus het boek van voor naar achter volgt),
  en anders de placeholder; er is geen algemeen beeld per werk. Eerste
  set: 1 Nephi, Alma, Het leven van Christus (voor een cursus met slug
  `life-of-christ`, die er nog niet is), podcast (algemeen), De Slimste
  Heilige en de tekst van de dag. Spelcovers staan per spel-id in
  `GAME_COVERS` en worden overal gebruikt waar een spel als kaart staat
  (Vandaag, Voor jou en de spelkaarten op Spelen in `LiveLobbyForm`).
  `versado/Carousel.tsx` is de veegrij met puntjes en pijlen.
- **Mascottes**: de uitrol is begonnen, met NOVI als eerste (zie
  "Mascottes" hieronder). Er zijn twee definitieve assets: `novi`/`greeting`
  (Vandaag) en `family`/`welcome` (publieke homepage).
  `versado/MascotSlot.tsx` is de enige interface; het register in
  `src/lib/mascots.ts` kent de bestanden in `public/mascots/static/`. Zolang
  een asset ontbreekt, rendert een slot niets.

## Wat Versado is

Een leer-, lees- en spelapp rond het Boek van Mormon en aanverwante content
binnen De Kerk van Jezus Christus van de Heiligen der Laatste Dagen: lessen en
cursussen, lezen en voorlezen, XP, reeksen, prestaties, divisies, vrienden,
uitdagingen, multiplayer- en gezinsspellen, podcasts. Self-hosted, in vijf
talen, met afzonderlijke app-taal en contenttaal (zie CLAUDE.md).

## Versado Design Constitution

Uitgangspunt voor alle toekomstige ontwikkeling:

1. Mobile first, maar niet mobile only.
2. Tablet en desktop krijgen een volwaardige interface.
3. Vandaag/dashboard is actiegericht.
4. Openstaande sociale acties krijgen hoge prioriteit.
5. Rust bij lezen/studeren, meer energie bij spellen.
6. De belangrijkste functies liggen maximaal één logisch navigatieniveau diep.
7. Primaire mobiele navigatie wordt voorbereid op Vandaag, Leren, Spelen en Vrienden.
8. Profiel is persoonlijke configuratie en hoeft geen primaire navigatiebestemming te zijn.
9. Vrienden en sociale interactie zijn kernfunctionaliteit.
10. Doorgaan waar je gebleven bent moet zeer eenvoudig zijn.
11. De drie mascottes hebben verschillende rollen maar één gezamenlijke visuele identiteit.
12. De hele familie verschijnt alleen bij betekenisvolle momenten.
13. Mascottes communiceren voornamelijk visueel.
14. Tekst van mascottes moet lokaliseerbaar zijn.
15. Geen emoji als structurele vervanging voor toekomstige Versado-iconografie of mascotte-assets.
16. Light mode en dark mode zijn beide first-class designs.
17. Kindergebruik gebruikt dezelfde interface met een andere standaardvolgorde van content.
18. Gebruikers kunnen hun aanbod/volgorde waar van toepassing zelf aanpassen.
19. UI-taal en contenttaal blijven afzonderlijk.
20. De PWA moet zoveel mogelijk aanvoelen als een native app.
21. Het ontwerp moet professioneel genoeg zijn om niet als hobbyproject over te komen.
22. Toekomstige afbeeldingen, illustraties en animaties moeten eenvoudig toegevoegd/vervangen kunnen worden zonder pagina-architectuur opnieuw te bouwen.
23. Bestaande werkende functionaliteit heeft altijd voorrang boven cosmetische wijzigingen.

Principe 15 betekent voor nieuwe code: geen nieuwe emoji als vast icoon of
illustratie in structurele plekken (navigatie, spel- en cursuskaarten,
lege staten). Bestaande emoji blijven staan tot het redesign ze vervangt; ze
worden niet vooraf omgebouwd. Emoji die inhoud zijn (reacties in de feed,
een door de gebruiker gekozen avatar-emoji, tekst in content) vallen hier
niet onder.

## Informatiearchitectuur (richting)

Menu's mogen niet diep worden. Op mobiel vier primaire bestemmingen:

| Bestemming | Wat erin hoort |
|---|---|
| **Vandaag** | Het centrale, actiegerichte dashboard: jouw beurt in een spel, uitdaging van een vriend, nieuw vriendschapsverzoek, verdergaan waar je was, dagelijkse content, reeks, relevante voortgang. Openstaande acties met vrienden prominent. |
| **Leren** | Cursussen, lessen, lezen, studiecontent, eventueel podcasts en andere educatieve content. |
| **Spelen** | Individuele spellen, multiplayer, actieve en live spellen, spellen op één of meerdere apparaten, gezins- en groepsactiviteiten. |
| **Vrienden** | Vriendenlijst, online vrienden, gedeelde live activiteit, competitie/divisies, sociale activiteit/feed, uitdagingen. Bijvoorbeeld één pagina met tabs Vrienden, Competitie en Activiteit; het principe is maximaal één logisch niveau diep, de vorm volgt uit Figma. |

**Profiel** gaat waarschijnlijk uit de primaire navigatie en wordt bereikbaar
via de gebruikersavatar rechtsboven.

### Huidige routes per toekomstige bestemming

Een indeling om bij het redesign op terug te vallen, geen opdracht om nu te
verplaatsen. Routes blijven bestaan (zie "Deep links").

| Bestemming | Bestaande routes |
|---|---|
| Vandaag | `/dashboard`; delen van `/streak`, tekst van de dag, open acties |
| Leren | `/courses`, `/courses/[courseId]` (+ `/chapter/[chapterId]`), `/lesson/[chapterId]`, `/reading-lesson/[lessonId]`, `/intro/[lessonId]`, `/kids/[storyId]`, `/fsy/[lessonId]`, `/podcast/[episodeId]/[mode]`, `/bookmarks`, `/tools` (`/dictionary`, `/persons`), `/practice` |
| Spelen | `/live` (spellenoverzicht + live duel), `/live/[code]`, `/challenges`, `/scrabble` (+ `[gameId]`), `/word-game`, `/word-search` (+ `[gameId]`), `/jigsaw`, `/alleskenner` (+ `alleen`, `seizoen`), `/chapter-guess` (+ `solo/[gameId]`), `/gezinsavond` |
| Vrienden | `/friends`, `/competition`, `/activity`, `/challenges` (ook sociaal) |
| Profiel (via avatar) | `/profile`, `/xp`, `/streak`, `/shop`, `/feedback`, `/change-password`, `/onboarding` (rondleiding), `/adminbackend` |
| Publiek | `/`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/uitnodiging/[code]`, `/privacy`, `/cookies`, `/feedback/respond/[token]` |

`/practice` en `/challenges` passen bij twee bestemmingen; kies dat bij het
ontwerp, niet vooraf.

### Deep links

Routes zijn ook opgeslagen buiten de code: `Notification.url` in de database,
push-payloads (`public/sw.js`), links in e-mails, uitnodigingslinks en
geïnstalleerde PWA's. Een route hernoemen of weghalen breekt die links. Bij
het redesign: bestaande routes laten werken (desnoods als doorverwijzing),
ook als een pagina onder een nieuwe bestemming valt.

## Mascottes

Versado heeft uiteindelijk drie mascottes: **VARO**, **VERA** en **NOVI**.
De uitrol gaat gefaseerd. **NOVI komt eerst**, met statische afbeeldingen.
VARO en VERA volgen later: voeg hun assets nu nog niet toe.

### Character canon

Gezamenlijk uitgangspunt: **"Ik ontdek dit samen met jou."** De mascottes
zijn geen leraren die boven de gebruiker staan. Ze reageren op wat de
gebruiker doet en ontdekken samen met de gebruiker.

Visuele familie:
- fantasie-vos/lynxachtige Versado-wezens: geen gewone vossen, geen mensen;
- donkere, navyblauwe vacht overheerst, met een crème snuit, borst en buik
  en herkenbare oranje accenten;
- grote puntige oren, expressieve ogen en een pluimstaart;
- dezelfde soort en familie, maar elk personage met een duidelijk eigen
  silhouet.

Rollen:
- **VARO**: nieuwsgierig · energiek · speels.
  - Hoort bij ontdekken, voortgang, competitie en grotere doelen.
- **VERA**: warm · slim · rustig.
  - Hoort bij begrijpen, lezen, verdieping en reflectie.
- **NOVI**: vrolijk · ontdekkend · ondeugend; de kleine avonturier.
  - Karakter: impulsief, enthousiast en wil overal bij zijn.
  - Hoort bij spelen, experimenteren, korte oefeningen, dagelijkse
    motivatie en verrassingen.
  - Bij een fout antwoord nooit boos, verdrietig of teleurgesteld, maar
    nieuwsgierig, positief of aanmoedigend (state `encourage`).

Accessoires zijn niet permanent, maar optioneel en contextueel. Ze komen alleen in beeld als ze
iets toevoegen aan de activiteit of het verhaal van de pose; NOVI kan bv. een
kleine rugzak of speelse ontdekvoorwerpen hebben. Elk personage moet zonder
accessoires direct herkenbaar zijn.

### Consistentie

De goedgekeurde Versado character sheet en de later goedgekeurde
NOVI-master en -afbeeldingen zijn de visuele bron van waarheid. Een nieuwe
asset mag een personage niet opnieuw interpreteren. Tussen alle afbeeldingen
blijven gelijk:
- lichaamsverhoudingen, grootte en leeftijdsindruk;
- hoofdvorm, snuit, ogen en oren;
- vachtpatroon en de navy/crème/oranje kleurverdeling;
- staart, handen en poten;
- de illustratie- en renderingstijl.

Een state is een functionele toestand in Versado, niet zomaar een emotie.

### Techniek

- **Eén interface.** `MascotSlot` (`src/components/versado/MascotSlot.tsx`)
  is de enige manier om een mascotte te tonen. Pagina's vragen om een
  personage en een state:
  `<MascotSlot character="novi" state="greeting" />`.
- **Geen paden in pagina's.** Directe assetpaden (`/mascots/static/...`)
  vanuit pagina's of andere componenten zijn verboden. Alleen het register
  `src/lib/mascots.ts` kent paden.
- **States.** `idle`, `greeting`, `thinking`, `discovery`, `reading`,
  `playing`, `success`, `encourage`, `celebrate`, `sleep`. Geen synoniemen;
  een nieuwe state is een bewuste ontwerpkeuze.
- **Bestanden.** `public/mascots/static/<personage>/<personage>-<state>.webp`:
  transparante WebP, kleine letters, zonder tekst, tekstballon of
  achtergrond in de afbeelding. Zie `public/mascots/README.md`. Originele
  bronbestanden horen niet in `public/`.
- **Registreren.** Een asset staat pas in het register als het bestand
  bestaat. Ontbreekt een asset, dan rendert het slot niets: geen emoji, geen
  ander personage, geen placeholder. `npm run test:mascots` bewaakt dat
  register en bestanden overeenkomen.
- **Rive-klaar, nog geen Rive.**
  - De keten is pagina → `MascotSlot(character, state)` → renderer. Nu is
    de renderer een statische WebP; later kan er achter `MascotSlot` een
    Rive-state machine komen, zonder dat pagina's veranderen.
  - De statische WebP-assets blijven dan in gebruik: als terugval bij
    `prefers-reduced-motion`, tijdens het laden en bij een fout, en op
    plekken waar beweging niets toevoegt.
  - Rive is nu bewust nog geen dependency, en er staan geen
    `.riv`-bestanden in de repository.
- **Beweging.** Mascottes vallen onder `vs-motion`, dus onder
  `prefers-reduced-motion` staat beweging stil. Een toekomstige renderer
  toont dan de statische afbeelding.
- **Bestaande plekken.**
  - Begroeting op Vandaag: `novi`/`greeting`.
  - Publieke homepage, bovenaan in plaats van het welkomstlogo:
    `family`/`welcome`, met de namen en eigenschappen als gewone tekst
    eronder (het beeld zelf is decoratief, `alt=""`).
  - Tekst van de dag: `vera`/`reading`, die pas iets toont als VERA's
    assets er zijn.
- **Personage-specifieke states.** `family` heeft een eigen, kleine lijst
  (`welcome`, `celebrate`); de states van NOVI, VARO en VERA gelden daar
  niet. Een combinatie als `family` + `greeting` is een typefout
  (`MascotTarget` in `src/lib/mascots.ts`).
- **Maat.** Een slot behoudt altijd de verhouding van de asset
  (`h-auto` + `object-contain`): nooit afsnijden of uitrekken. `size` is een
  breedte in px; een breedte-klasse (bv. `w-full max-w-md`) maakt hem
  vloeiend.

### Afspraken

- De gebruiker krijgt later een persoonlijke metgezel; de personages kunnen
  daarnaast contextueel verschijnen (bv. VERA bij lezen, NOVI bij een kort
  spel). Een keuze bij de onboarding en een databaseveld daarvoor komen
  later.
- **De familie: `family-welcome` en `family-celebrate` zijn verschillend.**
  - `family-welcome` is de algemene introductie van VARO, VERA en NOVI
    samen. Hij hoort op plekken waar de mascottefamilie zelf wordt
    voorgesteld, zoals de publieke homepage.
  - `family-celebrate` (nog geen asset) is uitsluitend voor betekenisvolle
    momenten in de app: een belangrijke mijlpaal, een afgeronde cursus, een
    bijzondere prestatie, promotie in een divisie, een lange reeks of een
    belangrijk gezamenlijk spelmoment.
  - Dat `family-welcome` bestaat, betekent niet dat de familie overal als
    decoratie mag verschijnen.
- **Namen en vertalingen.** De namen VARO, VERA en NOVI (in de app: Varo,
  Vera, Novi) worden nooit vertaald. Eigenschappen en omschrijvingen wel, en
  niet letterlijk: kies per taal korte, natuurlijke woorden die dezelfde
  persoonlijkheid en rol overbrengen en in de interface passen. Grammaticaal
  geslacht mag per taal worden toegepast (Varo mannelijk, Vera vrouwelijk);
  voor NOVI ligt geen geslacht vast, dus daar woorden zonder geslachtsvorm.
- Communicatie vooral via houding, animatie en gezichtsuitdrukking.
  Tekstballonnen zijn uitzondering; tekst altijd via het i18n-systeem
  (`src/lib/i18n/messages/*`), nooit vast in een asset of component.
- Geen tijdelijke vervangers (emoji-mascottes, gegenereerde of willekeurige
  afbeeldingen), en geen mascottes op eigen initiatief aan andere pagina's
  toevoegen.

## Kinderen

Er komt **geen** aparte kinderinterface of kinder-app. Kinderen gebruiken
dezelfde Versado-interface; alleen de standaardvolgorde van het aanbod kan
anders zijn (kinderboek, kinderspellen en passende cursussen hoger). De
gebruiker kan die volgorde zelf aanpassen.

Huidige stand: er bestaat een kindercursus (`CourseType.KIDS`, slug
`kinderen`, `KidsStory`/`KidsCourseView`), maar geen kenmerk "kind" op een
gebruiker (geen leeftijd of doelgroep in het datamodel). Een persoonlijke
volgorde bestaat al voor cursussen en spellen (`UserListOrder`,
`/api/list-order`, `SortableList` op `/courses` en `/live`). Een andere
standaardvolgorde voor kinderen hoort daarop aan te sluiten: dezelfde lijsten,
een andere standaard als er geen eigen volgorde is. Bouw geen aparte
"adult"/"kids"-schermen of -routes.

## Onboarding

Bestaat al: `/onboarding` (`OnboardingClient.tsx`), afgerond via
`/api/onboarding/complete` (`User.onboardingSeenAt`; bestaande accounts kregen
bij de invoering een backfill). Stappen nu: kennisniveau
(`User.bomKnowledgeLevel`), webapp installeren (overgeslagen als de app al
geïnstalleerd draait), uitleg, vrienden zoeken en vindbaarheid, online-status,
notificaties. Opnieuw te openen via Profiel ("rondleiding").

Mag later uitgebreider worden (kennismaken met Versado, persoonlijke
metgezel, uitleg XP/reeks/divisies, contentvoorkeuren). Bouw voort op de
bestaande flow in plaats van een nieuwe ernaast.

## Talen

Twee aparte keuzes, en dat blijft zo: `User.uiLanguage` (app-teksten) en
`User.contentLanguage` (uitgave die je leest en speelt). Niet samenvoegen.
Alle nieuwe UI-tekst via `useT()`/`getT()`, in alle talen met
`uiReady: true` (nu nl, en, de, fr, es; controle `npx tsx
scripts/i18n/check.ts`). Geen vaste Nederlandse UI-tekst. Details in
CLAUDE.md ("Talen").

## Upcoming design assets

De definitieve visuele assets worden **later aangeleverd** en zitten nu niet
in de repository:

- de drie Versado-mascottes (VARO, VERA, NOVI), in verschillende states
  (NOVI eerst, in `public/mascots/static/novi/`, en de familie in
  `public/mascots/static/family/`; zie "Mascottes");
- illustraties;
- afbeeldingen voor cursussen en content;
- afbeeldingen voor spellen;
- mogelijk geanimeerde assets;
- waarschijnlijk Rive-assets met state machines.

Tot ze er zijn: geen tijdelijke vervangers. Ga er bij nieuwe code niet van uit
dat beeld statisch of decoratief is: een asset kan later responsief,
geanimeerd of afhankelijk van context/toestand zijn (bv. een mascotte die
reageert op een goed antwoord). Houd plekken voor beeld daarom los van de
pagina-opbouw, zodat een asset vervangen geen pagina-herbouw vraagt.

Wat al bestaat en blijft: het door de beheerder ingestelde logo, heldenlogo en
favicon (`BrandingSettings`, `/adminbackend`), de illustraties van de
kindercursus (`public/kids`, met toestemming gebruikt, zie CLAUDE.md; ook
gebruikt door de legpuzzel) en de kaartbeelden van de gezinsavond
(`public/gezinsavond`).

## Huidige stand (inventaris)

Gecontroleerd in de code; bestandsnamen om snel terug te vinden.

**Navigatie en lay-out**
- `BottomNav.tsx`: vaste onderbalk met zes bestemmingen, op elk
  schermformaat dezelfde: Cursussen (`/courses`), Vrienden, Competitie, Spelen
  (`/live`), Activiteit, Profiel. Emoji als icoon, geen markering van de
  huidige pagina, het dashboard staat er niet in (bereikbaar via het logo).
- Header in `src/app/layout.tsx` (in `StickyHeader`): logo (voor ingelogde
  gebruikers pas vanaf desktopbreedte `lg`), contentkiezer
  (`ContentSwitcher`), meldingen (`NotificationCenter`), reeks en XP
  (`NavUserBadges`). Geen avatar of profielingang in de header.
- Contentkiezer gesloten: volledige naam, anders de afkorting, anders alleen
  het icoon, gekozen op de gemeten vrije ruimte in de header (niet op een
  breakpoint). Icoon en afkorting per taal staan per contentbron in
  `src/lib/contentMetadata.ts`; de volledige naam is de naam van de uitgave.
  Het geopende menu en het aria-label tonen altijd de volledige naam.
- Daaronder in dezelfde vaste balk: kop van detailpagina's met terugpijl
  (`SubpageBackBar`), podcast- en voorlees-minispeler. `--header-height` wordt gemeten en door `<main>`
  gebruikt.
- Breedte: `max-w-5xl` als standaard (zie CLAUDE.md "Paginabreedte"). De
  lay-out is overwegend één kolom; tablet/desktop krijgen vooral meer breedte,
  geen eigen navigatie (geen zijbalk). Breakpoint-varianten
  (`sm:`/`md:`/`lg:`) komen maar op enkele tientallen plekken voor.

**Vandaag / dashboard** (`src/app/dashboard/page.tsx`)
- Tekst van de dag, leesvoortgang Boek van Mormon (contenttaal), aantal
  vrienden online, en "open acties": vriendschapsverzoeken, ontvangen
  uitdagingen, woordspelbeurten.
- Doorverwijzingen vooraf: wachtwoord wijzigen, e-mail bevestigen, onboarding.
- Al beschikbaar maar niet op het dashboard gebruikt:
  - `/api/activity-status` bundelt uitdagingen, woordspellen, live spellen en
    uitnodigingen (`LiveGameInvite`) en solo Raad het hoofdstuk; nu alleen
    gebruikt door `ActiveGamesBanner` op `/live`.
  - Meldingencentrum (`/api/notifications`, `Notification`).
  - "Verdergaan": `UserCourseProgress` (`currentChapterId`,
    `currentLessonId`, `lastActivityAt`) per cursus en
    `PodcastPlaybackProgress` per aflevering.
  - Dagelijkse spellen: woord van de dag, De Slimste Heilige van de dag.
- Het dashboard doet een deel van dezelfde queries als `/api/activity-status`
  opnieuw. Bij het bouwen van Vandaag één bron kiezen in plaats van een derde
  variant.

**Vrienden en sociaal**
- `/friends` (`FriendsClient`): lijst, verzoeken, zoeken (handle#nummer,
  e-mail alleen als de ander dat toestaat), uitnodigingslink, freeze cadeau
  geven, online-status en huidige activiteit.
- Aanwezigheid: `src/lib/presence.ts`, `ActivityTracker`, Socket.io.
  Privacy standaard uit en server-side afgedwongen: `shareOnlineStatus`,
  `shareCurrentActivity` (alleen met online-status aan), tijdelijk onzichtbaar
  (`invisibleUntil`), vindbaarheid via e-mail (`searchableByEmail`).
- `/activity` (`ActivityFeedClient`, `src/lib/activityFeed.ts`): gebundelde
  XP-activiteit en prestaties van jezelf en vrienden, reacties met emoji
  (niet op eigen activiteit).
- `/challenges`: asynchrone duels per hoofdstuk.

**Competitie, XP, reeks, prestaties**
- `/competition` (`LeaderboardClient`): tabbladen divisie, vrienden,
  nationaal; `DivisionScroller` voor de divisies. Weekelijkse promotie en
  degradatie in `scheduler.ts`/`leagues.ts`, seizoenen.
- XP: `src/lib/xp.ts` (bron van waarheid, `XPTransaction`),
  competitie-XP `competitionXp.ts`, historie `/xp`.
- Reeks: `src/lib/streak.ts`, `/streak`, freezes (ook automatisch ingezet
  door de minuuttick in `scheduler.ts`), winkel `/shop`.
- Prestaties: `src/lib/achievements.ts`, `Achievement` (icoon als emoji in de
  database), getoond op het profiel.

**Leren**
- `/courses` (`CoursesClient`): eigen cursuslijst met sleepvolgorde. Typen
  (`CourseType`): FRONT_TO_BACK en READING_LESSONS (in de app "Hoofdstuk voor
  hoofdstuk" en "Stap voor stap"), FREE_CHOICE, BY_BOOK, PODCAST, KIDS,
  INTRO, FSY.
- Lezen: `ReadingChapterView`, `LessonFlow`, `ReadingLessonFlow`, voorlezen
  met eigen of kerk-audio (`ReadAloudPlayer`, minispeler, `audioMirror.ts`),
  bladwijzers en markeringen.
- Meerdere werken en uitgaven via de contentkiezer (`ContentCollection` met
  `work` + `language`).

**Spelen** (overzicht in `LiveLobbyForm` op `/live`, met sleepvolgorde)
- Legpuzzel, woordzoeker, woord van de dag, woordspel (asynchroon één tegen
  één), De Slimste Heilige (quizavond op eigen telefoons, seizoenen, solo van
  de dag en oefenen), gezinsavond (bordspel: samen aan tafel op één apparaat
  of ieder op eigen telefoon), Raad het hoofdstuk (live en solo), uitdagingen,
  live duel via code. Aan of uit per spel (`gameSettings`) en per
  contentcollectie (`GameContentScope`).
- Live spellen draaien in-memory in `src/server/gameServer.ts` (Socket.io).

**Profiel** (`ProfileClient`)
- Bovenaan wie je bent (avatar, naam, reeks, XP, freezes, hoofdstukken,
  divisie), daaronder de acties Winkel en Feedback (de enige ingang naar de
  winkel), dan competitie en voortgang (prestaties, leesvoortgang),
  Voorkeuren (weergave, taal, voorlezen, meldingen, online en activiteit,
  privacy), Over (wat is nieuw, rondleiding) en Account en beveiliging
  (2FA, wachtwoord, uitloggen). Account verwijderen staat los en klein
  onderaan. Onderdelen openen op een eigen adres (`src/lib/profileViews.ts`).

**PWA en meldingen**
- Dynamisch manifest `/api/branding/manifest` (ook op `/manifest.webmanifest`),
  eigen favicon/apple-touch-icon uit branding, `viewportFit: cover` en
  safe-area-marges, installatiehint (`HeaderInstallHint`, `InstallAppCard`),
  `EdgeSwipeGuard`.
- `public/sw.js`: push, app-badge en doorgeefluik voor fetch. **Geen cache en
  geen offline-modus.**
- Meldingen: `src/lib/notify.ts` (push, e-mail, meldingencentrum per
  categorie).

**Thema**
- Dark mode via de klasse `dark` (`ThemeScript` zet hem vóór het tekenen en
  volgt een wisseling van het systeemthema). Keuze Systeem, Licht of Donker
  onder Voorkeuren in het profiel (`ThemePreference`); geen opgeslagen
  voorkeur in localStorage betekent Systeem.
- Kleuren: Tailwind-palet `brand`/`gold`/`ice` in `tailwind.config.ts`, font
  Nunito, animaties `pop` en `shake`. Kleuren staan als vaste klassen in de
  componenten (ruim 1200 `dark:`-varianten), niet als centrale variabelen.

**Beeld en assets**
- Overal gewone `<img>` (geen `next/image`), assets in `public/` of als
  data-URL in de database (branding).
- Emoji als structureel icoon in de code: onderbalk, spelkaarten
  (`LiveLobbyForm`), actiesoorten (`ActiveGamesBanner`), dashboardacties,
  statistieken in het profiel, header-logo zonder eigen logo.
- Emoji als data in de database: `Achievement.icon`, `ContentCollection.icon`,
  `User.avatarEmoji` (keuze van de gebruiker), en als kopie in
  `ActivityFeedItem.achievementIcon`.
- Goed voorbereid: `DivisionScroller` houdt het divisie-icoon bewust
  vervangbaar (alleen `TierIcon` hoeft later een afbeelding te tonen).
- Geen illustratie- of animatiebibliotheek. Mascottes lopen via
  `MascotSlot` met statische WebP (zie "Mascottes"); beweging valt onder
  `vs-motion` (`prefers-reduced-motion`).

## Wat het redesign straks raakt

Om te weten waar de impact zit. **Niet vooraf aanpassen voor het redesign.**

- **Navigatie**: `BottomNav.tsx` (zes naar vier bestemmingen, actieve
  markering, iconen), header in `layout.tsx` (avatar/profielingang), mogelijk
  een eigen navigatie voor tablet/desktop.
- **Vandaag**: `src/app/dashboard/page.tsx`, met de bestaande bronnen
  hierboven (`/api/activity-status`, meldingen, `UserCourseProgress`,
  podcastposities, dagelijkse content).
- **Vrienden**: `/friends`, `/competition` en `/activity` samen onder één
  bestemming; `FriendsClient`, `LeaderboardClient`, `ActivityFeedClient`,
  `DivisionScroller`.
- **Leren/Spelen**: `CoursesClient` en de cursusweergaven (`*CourseView`),
  `LiveLobbyForm` (spellenoverzicht), spelkaarten en cursuskaarten krijgen
  eigen beeld.
- **Profiel**: `ProfileClient` waarschijnlijk splitsen in "wie ben ik"
  (statistieken, prestaties) en instellingen.
- **Onboarding**: `OnboardingClient` (metgezel kiezen, meer uitleg).
- **Thema en stijl**: `tailwind.config.ts`, `src/app/globals.css`
  (`.card`, `.btn`, `.input`), kleuren in alle componenten.
- **Beloningsmomenten** voor mascottes/familie: afronden van les en cursus
  (`LessonFlow` en verwanten), prestaties (`achievements.ts`,
  `notifyAchievement`), promotie (`notifyWeeklyResult`), reeksmijlpalen
  (`streak.ts`), einde van gezamenlijke spellen.
- **Publieke startpagina**: `src/app/page.tsx`, `HomeIntroSections`.

## Aandachtspunten voor beeld, mascottes en Rive

Geen van deze punten blokkeert vandaag iets, en dus wordt er nu niets
omgebouwd. Ze zijn bedoeld om bij het redesign de juiste keuze te maken.

1. **Emoji als data.** `Achievement.icon` en `ContentCollection.icon` bevatten
   een emoji; `ActivityFeedItem` kopieert het prestatie-icoon zelfs per regel.
   Nieuwe beelden niet in die velden stoppen, maar per sleutel (slug of id)
   koppelen, zodat oude regels ook het nieuwe beeld tonen. De feed bewaart
   `achievementSlug` al; toon beeld daarop, niet op de gekopieerde emoji.
2. **Geen centrale plek voor iconen en illustraties.** Beeld staat nu verspreid
   in componenten (onderbalk, spelkaarten, actiesoorten, dashboard). Bij het
   redesign één component of register per soort (icoon, illustratie,
   mascotte) dat een sleutel omzet in een asset. Dan is vervangen, of een
   statisch beeld inruilen voor een animatie, één wijziging.
3. **Kleuren zijn niet centraal.** Ruim 1200 `dark:`-varianten met vaste
   Tailwind-kleuren. Een nieuw palet uit Figma raakt dan elk component. Bij het
   redesign kleuren als semantische variabelen (CSS custom properties, via
   `tailwind.config.ts`) met een licht en een donker thema; niet vooraf.
4. **Beweging.** `vs-motion` legt beweging stil onder
   `prefers-reduced-motion`. Animaties en Rive-mascottes moeten die voorkeur
   respecteren (de statische mascotte-WebP als terugval) en mogen informatie
   niet alleen via beweging overbrengen.
5. **Rive.** Rive is nog geen dependency; `MascotSlot` is wel al zo opgezet
   dat een Rive-renderer er later achter kan (zie "Mascottes"). Het runtime draait alleen in de
   browser (component alleen client-side laden). Het gebruikt WebAssembly dat
   standaard van een externe CDN komt; voor deze self-hosted app het
   `.wasm`-bestand zelf meeleveren. Komt er ooit een Content-Security-Policy
   (nu bewust niet, zie `deploy/nginx/nginx.conf`), dan moet die WebAssembly
   toestaan.
6. **Laden en cache.** `public/sw.js` bewaart niets; grote illustraties en
   `.riv`-bestanden worden dus bij elk bezoek opnieuw gecontroleerd. Geef
   assets bij voorkeur een naam met versie of hash, zodat lange cache kan, en
   overweeg bij het redesign een eenvoudige asset-cache in de service worker.
7. **Toegankelijkheid.** Decoratief beeld `alt=""`/`aria-hidden`; beeld dat
   iets betekent (een mascotte die "goed zo" uitdrukt) krijgt een vertaalde
   tekstuele tegenhanger via i18n.

## Openstaande punten, los van het redesign

Gevonden bij dit onderzoek; niet aangepast, want buiten deze opdracht:

- **Privacy van de activiteitenfeed.** `/api/activity-feed` toont XP en
  prestaties van alle vrienden, zonder eigen instelling en zonder rekening te
  houden met `shareOnlineStatus`/`shareCurrentActivity`. De rest van de app
  werkt privacy-by-default (alles standaard uit). Beslissen of hier een eigen
  schakelaar (standaard uit, met backfill volgens het migratiebeleid) hoort.
- **Vaste tekst op het dashboard.** Als de uitgave geen naam heeft, toont het
  dashboard vast "Boek van Mormon" (`dashboard/page.tsx`); hoort via i18n.

## Werkafspraken voor dit traject

- Eerst de bestaande code lezen, niet uitgaan van aannames; veel wat Vandaag
  of Vrienden nodig heeft, bestaat al (zie inventaris).
- Geen database-schema, API-contract of Socket.io-gedrag wijzigen zonder
  duidelijke noodzaak.
- Responsive gedrag, dark mode, toegankelijkheid, i18n, PWA en
  privacy-instellingen blijven werken.
- Geen grote refactor alleen om code mooier te maken, en geen visuele keuzes
  die de Figma-ontwerpen voor de voeten lopen.
- Werk dit document bij als de richting verandert of een deel van het
  redesign is uitgevoerd.
