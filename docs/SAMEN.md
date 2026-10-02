# Samen: vriendenreeksen, groepen en seintjes

Versado beloont samen volhouden, niet onderlinge competitie.

- **Vriendenreeksen** zijn bewust streng en persoonlijk: twee vrienden houden
  allebei hun reeks vast.
- **Groepsreeksen** zijn bewust tolerant en gezamenlijk: genoeg leden samen,
  niet iedereen.
- **Seintjes** zijn lichte sociale duwtjes, geen chat.
- Een **geschonken reeksbevriezing** beschermt de groep alleen als dat echt
  nodig blijkt.

Code: `src/lib/social/`, schermen in `src/components/social/` en
`src/app/groups/`, tests met `npm run test:social`.

## De bron: de persoonlijke reeks

Er is één regel voor wat een geldige dag is, en die zit in de persoonlijke
reeks (`recordLearningActivity`, zie `docs/LEERVOORTGANG.md`). Samen voegt
daar niets aan toe en verandert er niets aan:

```
geldige activiteit → persoonlijke reeks (StreakDay) → sociale reeksen
```

Iemand draagt op dag D bij als hij een `StreakDay` heeft voor zijn eigen
kalenderdag D, gestudeerd (`STUDIED`) of bevroren (`FROZEN`, een persoonlijke
reeksbevriezing). Een sociale reeks heeft dus geen eigen oefeningen,
activiteitsregels of XP. Bijdragen aan een groep, een seintje geven of een
bevriezing schenken levert nooit XP op.

### Wanneer is een dag definitief? (`rules.ts`)

Een bevroren dag krijgt pas een rij als de dag voorbij is (reeksafsluiting in
`scheduler.ts`, of de volgende studiedag). "Geen rij" is daarom pas
definitief "niet behouden" als:

- D in beide tijdzones van de reeksregel voorbij is (de huidige, en die van
  de laatste reeksdag; zie `docs/TIJD.md`);
- en de eigen reeks die dag al heeft verwerkt (geen lopende reeks met een
  oudere laatste dag meer).

Het uiterste moment is wanneer D overal ter wereld voorbij is (`dayOverEverywhere`).

`resolveSocialDay` is de gedeelde uitkomst voor vriend- en groepsreeks:

- **gehaald**: genoeg bijdragen. Dat kan al tijdens de dag en is daarna
  definitief.
- **beschermd**: het doel is niet gehaald, maar er was een bevriezing aangeboden.
- **gepauzeerd**: minder dan 3 leden telden mee.
- **gemist**: geen van de bovenstaande.

## Vriendenreeks (`friendStreaks.ts`)

- Altijd precies twee vrienden. Uitnodigen en accepteren (`PENDING` → `ACTIVE`).
- Per paar hooguit één open of lopende reeks: `openKey` is uniek en wordt
  `null` zodra de reeks stopt.
- Een dag telt als beiden die dag hun reeks behielden, ieder op de eigen
  kalenderdag. Er is bewust geen compensatie voor tijdzoneverschillen.
- De eerste dag is de nieuwste "vandaag" van de twee op het moment van
  accepteren. Hebben ze die dag al allebei gestudeerd, dan telt hij meteen.
- Maximaal 5 actieve reeksen per persoon. Uitnodigen en accepteren
  controleren dat onder rijvergrendeling.
- Een lopende reeks kun je niet zelf stoppen. Hij stopt pas als hij verbreekt
  (`BROKEN`, de plek komt vrij), of als de vriendschap eindigt (`ENDED`).
- Prestaties `friend-streak-1/7/30/100/365`, op basis van de langste
  vriendenreeks die je ooit had. Ze blijven dus staan na een breuk.

## Groepen (`groups.ts`, `groupStreak.ts`, `groupFreeze.ts`)

Een groep heeft bewust **geen type**: een naam, leden, beheerders,
instellingen, een reeks, prestaties en geschiedenis. Wat het is (gezin, klas,
wijk), bepalen de mensen zelf.

### Limieten

De limieten staan in `rules.ts`. Ze worden gecontroleerd in één transactie
met rijvergrendeling, altijd eerst gebruikers en dan de groep:

- maximaal 500 leden per groep (`GROUP_MAX_MEMBERS`);
- maximaal 10 groepen per persoon;
- minimaal 3 leden die meetellen, anders is de reeks gepauzeerd;
- 7 dagen wachttijd na vertrekken of verwijderd worden. Een uitnodiging
  omzeilt die niet: accepteren controleert alles opnieuw.

### Hoeveel leden moeten bijdragen?

```
requiredPercentage   = 45 + 55 / sqrt(n)
requiredContributors = ceil(n × requiredPercentage / 100)   (bij n = 3: altijd 3)
```

Voorbeelden: 4 → 3, 10 → 7, 25 → 14, 100 → 51, 500 → 238. Er is één
functie, `requiredContributors`. De app toont aantallen ("11 van 15 nodig",
"Nog 4 nodig"), nooit het percentage.

### Wie telt mee op een groepsdag?

- Een lid telt mee vanaf `GroupMembership.eligibleFromDay`. Dat is de dag na
  de nieuwste kalenderdag die bij het toetreden al bij een van de leden was
  begonnen. Zo verandert het vereiste aantal van een lopende dag nooit door
  een nieuwkomer.
- Vertrekken of verwijderd worden telt direct: het lid valt uit de lopende
  dag.
- Afgesloten dagen (`GroupDay.settledAt`) veranderen nooit meer. Een gehaalde
  dag blijft gehaald.
- Historische dagen tellen niet als persoonlijke bijdrage van een nieuwkomer.
  "Jouw bijdrage" telt alleen afgesloten, niet-gepauzeerde dagen vanaf de
  eigen instapdag.

### Bijwerken van de groepsreeks

Bijwerken is idempotent en veilig om vaak aan te roepen:

- De groep wordt vergrendeld met `FOR UPDATE SKIP LOCKED`.
- **Live**: een open dag met genoeg bijdragen wordt meteen `ACHIEVED`. De
  reeks gaat dan +1.
- **Afsluiten**: de oudste open dag (`nextDay`) wordt definitief zodra
  iedereen die meetelt hem voorbij is (`nextCheckAt`). De uitkomst is
  gehaald, beschermd (reeks blijft staan), gepauzeerd (reeks blijft staan)
  of gemist.
- Bij gemist begint de reeks opnieuw. Latere dagen die al gehaald waren
  (andere tijdzones liepen voor), tellen dan als begin van de nieuwe reeks.

Dit gebeurt op drie momenten:

- elke minuut in `scheduler.ts` (`runSocialTick`): nieuwe `StreakDay`-rijen
  sinds de vorige tick, en groepen waarvan een dag afgesloten kan worden;
- bij het openen van de groepspagina;
- elk uur voor de beheerders.

Tellingen gaan per groep in één query (`groupDays.ts`), ook bij 500 leden.

### Geschonken reeksbevriezing

- Een lid biedt een eigen reeksbevriezing aan voor de groepsdag van vandaag
  (de eigen kalenderdag). Hij wordt meteen apart gezet (`GROUP_RESERVED`,
  freezeCount −1), zodat hij niet ook elders gebruikt kan worden.
- Hooguit één per groepsdag (uniek op groep + dag). Een tweede gelijktijdige
  poging faalt zonder iets af te schrijven.
- Haalt de groep het doel alsnog, dan gaat hij terug (`GROUP_RELEASED`) en
  krijgt de aanbieder "Niet nodig!". Er volgt geen wachttijd.
- Is de dag gemist, dan wordt hij gebruikt (`CONSUMED`). De reeks blijft
  staan maar telt niet op (184 blijft 184). Eén bevriezing beschermt één dag,
  hoeveel mensen er ook ontbraken.
- Na gebruik geldt 30 dagen wachttijd voor die persoon in die groep. Die volgt
  uit de `CONSUMED`-rijen zelf, dus vertrekken en terugkomen zet hem niet
  terug. Anderen en andere groepen kunnen gewoon.
- Vertrekt de aanbieder, dan gaat de bevriezing terug (`CANCELLED`).

### Beheerders

- De maker is beheerder. Er kunnen meerdere beheerders zijn, en er blijft
  altijd minstens één.
- Een beheerder kan eerst de beheerdersrol afnemen en daarna verwijderen;
  een beheerder rechtstreeks verwijderen kan niet.
- Een beheerder die 14 dagen op rij niet studeerde, wordt weer gewoon lid
  (een bevroren dag is geen activiteit). Een andere beheerder kan hem later
  opnieuw beheerder maken.
- Is er geen beheerder meer, dan wordt automatisch een actief lid gekozen:
  eerst de grootste bijdrage aan de huidige groepsreeks, bij gelijke stand
  wie het langst lid is.

### Privacy en ranglijst

- Een groep is standaard privé. `showOnLeaderboard` (alleen beheerders) zet
  hem op de openbare groepsranglijst. Daar staan naam, aantal leden, reeks en
  het aantal prestaties.
- De ledenlijst is alleen zichtbaar voor leden.
- Via de ranglijst kun je geen mensen vinden of vriendschapsverzoeken sturen.
- Uitnodigen kan alleen voor eigen vrienden. Gewone leden kunnen alleen
  uitnodigen als de beheerders `membersCanInvite` aanlaten (standaard aan).
- Vanuit de ledenlijst kun je een vriendschapsverzoek sturen aan leden die
  nog geen vriend zijn.

## Seintjes (`nudges.ts`)

- Generiek opgezet (`NudgeContext`). De context bepaalt alleen de tweede
  regel van de melding. Spellen kunnen het later ook gebruiken.
- Alleen tussen vrienden, ook binnen een groep. Er is geen knop om alle
  inactieve leden tegelijk een seintje te geven.
- Hooguit één per 6 uur per richting. Dit gaat via één atomaire
  insert-of-update op `Nudge`, die alleen het laatste seintje bewaart. Er is
  bewust geen teller en geen geschiedenis.
- De instelling "Seintjes van vrienden" (`User.nudgesEnabled`, standaard aan)
  staat bij de meldingen in het profiel. Staat hij uit, dan toont de app bij
  die vriend geen seintjesknop.

## Meldingen

Meldingen gaan via `notify.ts`, met de bestaande voorkeuren (categorie
"social").

- **Persoonlijk**, als gewone melding met push en e-mail volgens de
  voorkeuren: uitnodigingen, seintjes, "Niet nodig!", "Jouw reeksbevriezing is
  gebruikt" en nieuwe beheerder.
- **Groepsbreed**, zoals "Thomas heeft de reeks gered!": alleen in het
  meldingencentrum, in één keer (`notifyGroupMembersInApp`), zonder push of
  e-mail. Zo wordt een groep van honderden leden niet bestookt.
- Een aangeboden bevriezing staat op de groepspagina, niet in een melding.

## Geschiedenis (`SocialEvent`)

Vanaf de eerste versie wordt elke betekenisvolle gebeurtenis vastgelegd, voor
een latere tijdlijn:

- groep gestart, lid erbij of weg, beheerderswissels;
- reeks gestart, dag gehaald, perfecte dag, mijlpaal, verbroken, gepauzeerd of
  hervat;
- bevriezing aangeboden, teruggegeven of gebruikt, en wie de reeks redde;
- de dagen, mijlpalen en breuk van vriendenreeksen.

Een tijdlijnscherm is er nog niet.

## Prestaties

- **Vriendenreeksen**: prestaties per gebruiker (`Achievement`), zonder XP.
- **Groepen**: prestaties per groep (`GroupAchievement`). Dat zijn eerste dag,
  7, 30, 100 en 365 dagen, iedereen deed mee (perfecte dag), een perfecte week
  en samen gered.
- Alles wordt maar één keer toegekend (unieke sleutels) en blijft staan na een
  breuk.
- "Samen gered" kan een groep maar één keer verdienen. Er is dus geen reden om
  expres een dag te laten lopen.
