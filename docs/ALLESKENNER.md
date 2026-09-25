# De Alleskenner

Een live quizspel voor mensen die **fysiek bij elkaar** zijn. Iedereen speelt op
zijn eigen telefoon met zijn eigen account; de server bewaakt de spelstatus,
beurten, klokken en scores. Seconden zijn de enige score-eenheid. Je kunt hem
ook alleen spelen (zie "Alleen spelen").

Dit document legt het afgesproken ontwerp vast. Bouwstatus staat onderaan.

## Spelvormen

| | Met quizmaster | Zonder quizmaster |
|---|---|---|
| Voor | 3+ spelers, gezellige avond | 2–3 spelers, of als niemand quizmaster wil zijn |
| Quizmaster | Standaard de host; overdraagbaar vóór de start. Speelt niet mee. | – |
| Antwoorden | Hardop; de quizmaster tikt ✓/✗ op zijn scherm (dat de antwoorden toont) | Op je eigen telefoon tikken, of één woord typen |

- Geen spraakherkenning: hardop antwoorden + een quizmaster lost dat op zonder
  belasting van de server.
- **Passen** kan overal waar je aan de beurt bent.
- Wie niet meespeelt maar wel in de lobby zit, is **toeschouwer** en ziet vraag,
  klokken en stand live mee.

## Teams (vanaf 6 spelers)

- Onbeperkt aantal spelers, verdeeld over 2–5 teams, elk met een **teamleider**.
- **Teamscore** (seconden): alleen het antwoord van de teamleider telt.
- **Persoonlijke score**: teamleden tikken tijdens elke vraag stilletjes hun
  eigen keuze; dat telt alleen voor hun persoonlijke punten. De keuze van de
  teamleider is ook zijn persoonlijke keuze.
- Einde: winnend team én beste individuele speler.
- Om stil meeraden mogelijk te maken heeft elke vraag behalve de goede
  antwoorden ook geloofwaardige **foute opties** (die ook de tikvariant voeden).

## Rondes

Iedereen start met **60 seconden**. Vanaf ronde 2 **loopt je eigen klok af
zolang jij aan de beurt bent**. Bij de rondes met aanvullen begint de speler met
de minste seconden; na een pas of als je klaar bent, mag de volgende aanvullen.

| Ronde | Inhoud | Seconden |
|---|---|---|
| 3-6-9 | 15 meerkeuzevragen; goed = je houdt de beurt. Fout (of passen) = de volgende mag dezelfde vraag proberen; wie hem goed heeft krijgt de volgende vraag, weet niemand het, dan krijgt wie hem als eerste kreeg de volgende. Eén luistervraag: het vers wordt voorgelezen op het apparaat van wie aan de beurt is (of de quizmaster), en pas daarna start de bedenktijd. Klok loopt nog niet, wel een maximale bedenktijd. | +10 bij vraag 3, 6, 9, 12, 15 (voor wie hem goed heeft) |
| Open Deur | "Wat weet je eigenlijk van …?", 4 antwoorden; laagste stand kiest onderwerp | +20 per antwoord |
| Puzzel | 12 omschrijvingen, 3 groepen van 4, elk met een verbindend woord | +30 per groep |
| Galerij | Citaten (8 versfragmenten) of illustraties (8 kinderplaatjes) | +15 per antwoord |
| Collectief Geheugen | Hoofdstukinleiding 20 s in beeld, dan "wat weet je hiervan?", 5 antwoorden; tussenstand na elk fragment | +10/+20/+30/+40/+50 |
| Finale | Twee hoogste standen; "Wat weet je van …?", 5 antwoorden; laagste stand begint; eigen klok loopt | −20 bij de tegenstander per goed antwoord |

- **Kort spel**: 3-6-9, Puzzel, Finale. **Volledig spel**: alle rondes.
- Losse avond: de twee hoogste standen spelen de finale; wie de ander op 0
  zet is **de Alleskenner**. De rest kijkt mee.

## Seizoen (vaste vriendenavond, altijd individueel)

- Minimaal 4 leden. Tot de seizoensfinale kunnen leden erbij komen
  (achteraan de wachtrij).
- Elke avond **3 kandidaten**: de blijvers + nieuwkomers uit de wachtrij
  (de nieuwkomer krijgt de eerste 3-6-9-vraag). De rest is toeschouwer.
- Na de rondes: hoogste stand = Alleskenner van de avond (door); de andere twee
  spelen de finale; winnaar door, **verliezer ligt eruit** (dit seizoen niet
  meer spelen, ook niet na één avond).
- **Maximaal 3 avonden**; daarna stop je met eer (ongeslagen).
- Afwezige blijver: een nieuwkomer neemt de stoel; de blijver houdt zijn
  resterende avonden en speelt later verder.
- **Klassement**: seizoenspunten 3 (Alleskenner van de avond) / 2 (finale
  gewonnen) / 1 (finale verloren), opgeteld (max 9); gelijkstand → totaal
  verdiende seconden. Altijd zichtbaar op de seizoenspagina.

### Seizoensfinale

- Start zodra de wachtrij leeg is en er geen drie spelers meer zijn voor een
  gewone avond.
- **Iedereen die ongeslagen is** (nooit een finale verloren) doet mee; bij
  minder dan 3 wordt aangevuld met de hoogsten uit het klassement.
- Reeks avonden met dezelfde regels (verliezer eruit, nieuwe finalist erbij).
  **Instapvolgorde op klassement**: laagst geplaatsten beginnen, de nummer 1
  stapt als laatste in. Aantal finaleavonden = finalisten − 2.
- Laatste avond: 3 over; na de rondes spelen de beste twee de finale; wie de
  ander op 0 zet is **Alleskenner van het seizoen**.
- Host kan een afwezige finalist overslaan; die stapt later in.

- Finaleavonden tellen niet mee voor het klassement: dat bepaalt alleen de
  instapvolgorde.

### Host

- Host kan de hostrol op afstand overdragen; optioneel een vaste vervangende
  host, die ook avonden kan starten. Host is standaard quizmaster,
  overdraagbaar vóór de start; speelt de host zelf mee op een avond, dan is er
  standaard geen quizmaster.
- De opstelling van een avond wordt op de seizoenspagina vastgelegd (met
  afwezigen); in de lobby ligt die vast. Alle leden krijgen bij het openen van
  de lobby een uitnodiging (melding of push) en kijken mee als toeschouwer.
- Een avond die wordt gestopt of waarvan de lobby wordt geannuleerd, telt
  niet mee.

## Alleen spelen (`/alleskenner/alleen`)

- **Alleskenner van de dag**: elke dag voor iedereen dezelfde onderdelen,
  vastgelegd door wie als eerste speelt (`AlleskennerDailySet`, zelfde idee
  als het woord van de dag). Eén poging per dag (unieke index op
  `AlleskennerSoloRun(userId, dayKey)`); een lopend potje kun je hervatten.
  De dag is de UTC-dag van de rest van de app (`dayKey()`), net als de reeks.
- **Vrij oefenen**: zo vaak je wilt, met onderdelen die je nog niet had (zelfde
  keuze als bij een quizavond). Telt niet mee in het klassement.
- Rondes: 3-6-9 (negen vragen, punten bij 3, 6 en 9), Open Deur (kies één
  van drie onderwerpen), Puzzel, Galerij en Collectief Geheugen. Geen finale:
  daar is een tegenstander voor nodig. Je begint met 60 seconden; wat je
  overhoudt is je score.
- Van de dag heeft geen luistervraag: die vraagt geluid en de bedenktijd
  start pas na het voorlezen, wat in een klassement niet eerlijk te
  controleren is. Oefenen heeft er wel een.
- Klassementen: vandaag (seconden, bij gelijke stand wie eerder klaar was),
  deze week (seconden van alle dagen sinds maandag opgeteld) en vrienden
  (vandaag).
- XP (`soloXp`): van de dag 20 + seconden/5 (max 60), oefenen 5 +
  seconden/10 (max 20). Beide verlengen de reeks (`completeAlleskennerSolo`)
  en tellen als `ALLESKENNER_SOLO` mee voor de competitie. Zelf stoppen telt
  niet mee: geen XP, geen reeks, en de poging van de dag is wel op.
- Techniek: dezelfde spelserver als een quizavond, met een kamer van één
  deelnemer (`length = "SOLO"`, `ak:solo_join`), zonder `LiveGame`. Wat je
  alleen speelt, telt als gezien, dus het komt op een quizavond niet meteen
  terug. Na een herstart van de server begint een lopend potje opnieuw met
  dezelfde onderdelen.

## Inhoud

- Eén pool in de database (`AlleskennerItem`), elk onderdeel met een vaste ID.
- De app onthoudt per speler wat hij gezien heeft (`AlleskennerSeen`) en kiest
  eerst onderdelen die geen van de deelnemers kent; binnen een seizoen komt
  niets terug.
- **Nieuwe inhoud komt altijd via Claude Code**: concepten uit de brontekst
  (`prisma/bomContent.json`), goedgekeurd door de eigenaar, in
  `prisma/alleskennerContent.ts`. Elke bewering heeft een bronvers met een
  letterlijk citaat; `npm run alleskenner:check` weigert inhoud waarvan het
  citaat niet in dat vers staat.
- Daarnaast **automatisch samengestelde** onderdelen (`prisma/alleskennerGenerated.ts`),
  rechtstreeks uit bestaande bronnen zodat het antwoord per definitie klopt:
  "Wie wordt hier beschreven?" (personen van de introductiecursus), "In welk
  boek staat het hoofdstuk over …?" en puzzels/onderwerpen uit de officiële
  hoofdstukkoppen, "Welke naam ontbreekt?" en luistervragen uit de verzen,
  Collectief Geheugen met een hoofdstukkop, en galerijen. Vaste ID's
  (`gen-…`) en een vaste zaadwaarde, zodat "al gezien" en correcties in de
  beheeromgeving blijven werken. Bij het kiezen gaan nog niet geziene
  handgeschreven onderdelen voor; de generatoren wisselen elkaar af.
- Import zet nieuwe onderdelen erbij en werkt ongewijzigde onderdelen bij, maar
  **overschrijft nooit een onderdeel dat in de beheeromgeving is aangepast**.
- In `/adminbackend` staat alleen een editor voor **bestaande** onderdelen
  (corrigeren als JSON, uitschakelen, terugzetten naar het bestand) — geen
  nieuwe toevoegen. Een correctie doorloopt dezelfde controle als
  `npm run alleskenner:check` (`src/lib/alleskenner/validate.ts`), maar dan
  tegen de verzen in de database.
- Geen merknamen van bestaande tv-programma's in de app.

## Talen

- Spelers in verschillende contenttalen spelen samen op **dezelfde vragen**.
  Elk onderdeel kan een vertaling per taal hebben (`AlleskennerItemTranslation`,
  zelfde vorm als het Nederlandse onderdeel, opties in dezelfde volgorde).
- Automatisch samengestelde onderdelen worden omgezet via hun bron (kopdeel,
  vers of boek in de uitgave van die taal), nooit door Nederlandse tekst te
  vertalen: `prisma/alleskennerTranslate.ts`. Past de bron niet, dan heeft
  dat onderdeel in die taal geen vertaling. Handgeschreven vertalingen staan
  per ID in `prisma/alleskennerContent.<taal>.ts`, met letterlijke citaten uit
  die uitgave; `npm run alleskenner:check` controleert ze ook.
- De server rekent intern met de Nederlandse teksten en vertaalt per kijker
  via een woordenboek (`src/lib/alleskenner/localize.ts`); wat een speler in
  de eigen taal aantikt, gaat terug naar het Nederlands. Getypte antwoorden
  zijn goed in elke taal van het spel.
- Speelt er iemand in een andere taal mee (quizavond, of alleen oefenen), dan
  kiest het spel alleen onderdelen die in die taal bestaan; een Nederlands
  spel verandert niet. De Alleskenner van de dag is voor iedereen dezelfde rij;
  een onvertaald onderdeel ziet een speler in een andere taal in het Nederlands.
- Een onderdeel dat in de beheeromgeving is aangepast, gebruikt geen
  vertalingen meer (die horen bij de oorspronkelijke tekst).

## Techniek

- Een potje is een `LiveGame` met `mode = ALLESKENNER`, zodat uitnodigingen
  (push, melding bovenin, gloed bij Spelen) en `/api/activity-status` meteen
  werken. Meedoen gaat alleen via een uitnodiging van de host (vrienden) of,
  bij een seizoen, als lid (of host/vervangende host); de server weigert
  iedereen anders, ook met de link. De interne spelcode wordt nergens getoond.
- Spellogica in `src/server/alleskenner.ts` (niet in `gameServer.ts`); de
  spelstatus leeft in het geheugen van de server, zoals de andere live-spellen.
  Let op de eager-importketen van `server.ts` (zie `CLAUDE.md`).
- De server stuurt iedereen een **eigen weergave**: spelers krijgen nooit de
  antwoorden, de quizmaster wel.
- Alles wat aan de beurt is en seconden heeft, is een **deelnemer**: een losse
  speler of een team. Bij teams handelt alleen de teamleider; stille keuzes
  van teamleden worden pas bij de onthulling beoordeeld (1 persoonlijk punt
  per goed antwoord), zodat ze het antwoord niet kunnen doorfluisteren.
- Rondes zonder inhoud in de database (bv. nog geen galerijen) vallen bij de
  start automatisch weg.

## Bouwstatus

1. [x] Ontwerp vastgelegd (dit document)
2. [x] Contentmodel, controle, eerste inhoud
3. [x] Speelbare kern: lobby, quizmaster/tikvariant, 3-6-9, Puzzel, Finale
4. [x] Teams, Open Deur, Galerij, Collectief Geheugen, kort/volledig spel
5. [x] Seizoensmodus en seizoensfinale (`/alleskenner/seizoen`)
6. [x] Editor voor bestaande inhoud in `/adminbackend`
7. [x] Alleen spelen: van de dag met klassement, en vrij oefenen
