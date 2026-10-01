# Tijd en tijdzones in Versado

## Het principe

- **UTC is de waarheid voor tijdstippen.** Database-timestamps, de servertijd
  en de sessietijden van de Algemene Conferentie zijn absolute momenten.
  De klok van het toestel bepaalt nooit iets dat XP, beloningen of de reeks
  raakt: dat rekent de server met zijn eigen tijd.
- **De IANA-tijdzone van de gebruiker bepaalt de kalenderdag.** Wat
  "vandaag" is voor iemand, volgt uit servertijd + `User.timeZone`
  (bv. `Europe/Amsterdam`, `America/New_York`). Nooit een losse offset als
  `UTC+1`: die kent geen zomer- en wintertijd.

Alle hulpfuncties staan in `src/lib/timeZone.ts` (alleen `Intl`, geen extra
dependency): `isValidTimeZone`, `resolveTimeZone`, `zonedParts`,
`dayKeyInZone`, `hhmmInZone`, `startOfLocalDay`, `localDayRange`,
`userTimeZone`, `userDayKey`. Reken in een component of route niet zelf met
tijdzones; gebruik deze functies.

## De tijdzone van de gebruiker

- `TimeZoneSync.tsx` (in de layout, voor ingelogde gebruikers) leest
  `Intl.DateTimeFormat().resolvedOptions().timeZone` en stuurt die via
  `PATCH /api/account { timeZone }` als hij afwijkt van wat de server kent:
  bij de eerste keer en als de app na een reis weer in beeld komt. De server
  accepteert alleen geldige IANA-namen.
- `User.timeZone = null` (nog niet doorgegeven): `Europe/Amsterdam`, het
  gedrag van vóór de tijdzones.
- Het profiel toont de tijdzone ter informatie ("Automatisch · …"); het is
  geen instelling.

## Wat volgt welke klok?

| Onderdeel | Klok | Waarom |
|---|---|---|
| Reeks (`streak.ts`, `streakRules.ts`), reeksherstel 's nachts, reekskalender | lokale dag gebruiker | persoonlijk "vandaag" |
| "Vandaag al gestudeerd" (header, Vandaag), begroeting en datum op Vandaag | lokale dag/tijd gebruiker | persoonlijk |
| Studeerherinnering en tekst-van-de-dag-melding (`dailyReminderTime`, `dailyTextTime`) | kloktijd in eigen tijdzone | "om 20:00" is jouw 20:00 |
| Countdown Algemene Conferentie | sessies in UTC, weergave en "morgen/vandaag" lokaal | wereldwijd moment |
| Woord van de dag (wisselt 18:00 NL), tekst van de dag | vaste Nederlandse grens | één gedeeld woord/vers voor iedereen |
| Dagelijkse Alleskenner, competitie-XP-daglimieten, woordzoeker-XP-limiet | UTC-dag | gedeelde inhoud en antimisbruik: één vaste grens die niet met de tijdzone van een toestel te verschuiven is |
| Weekcompetitie, seizoenen, weekuitslag | UTC-week / vast NL-moment | gedeelde competitie, voor iedereen tegelijk |

## Reeks: reizen en tijdzonewissels

Een reeksdag is een kalenderdag in de tijdzone van de gebruiker. Naast
`lastStudyDate` staat `lastStudyTimeZone`: de tijdzone waarin die dag is
behaald. `streakDayGap` (in `src/lib/learning/streakRules.ts`) rekent het
aantal dagen sinds de laatste reeksdag in **beide** tijdzones uit en neemt
het kleinste:

- een dag is pas **nieuw** als hij in de huidige én in de vorige tijdzone
  nieuw is: een tijdzonewissel levert nooit een extra reeksdag op;
- een dag is pas **gemist** als hij in beide gemist is: reizen kost nooit
  een behaalde dag;
- springt de datum terug (reis naar het westen), dan telt vandaag al en
  wordt `lastStudyDate` nooit naar achteren gezet.

Een reeksdag ontstaat alleen door een activiteit die daarvoor telt
(`qualifiesForStreak`), nooit door alleen van tijdzone te wisselen.

## Bestaande gegevens

Vóór de tijdzones was elke reeksdag een UTC-dag (`dayKey()` in
`src/lib/dates.ts`). Daarom:

- `User.timeZone` en `User.lastStudyTimeZone` zijn toegevoegd zonder
  backfill; `null` betekent "standaard" respectievelijk "UTC-dag";
- `lastStudyTimeZone = null` wordt gelezen als `UTC`
  (`LEGACY_DAY_TIME_ZONE`), precies hoe die dag is vastgelegd; door de
  tweezoneregel kan de overgang dus geen dag kosten;
- historische `StreakDay`-rijen blijven ongewijzigd.

## Algemene Conferentie

`src/lib/generalConference.ts`: conferenties t/m oktober 2036, sessies als
absolute UTC-momenten bij officieel aangekondigde conferenties, en zonder
sessies (alleen datum) bij verwachte. Zie de commentaar daar voor bronnen en
hoe je een conferentie bijwerkt. De countdown (`GeneralConferenceCountdown`)
neemt de servertijd mee, werkt één keer per minuut bij en toont kloktijden
in de tijdzone van het toestel.

## Tests

- `npm run test:time`: tijdzones (Amsterdam, New York, Los Angeles, Tokio,
  Sydney), 23:59/00:00, zomer-/wintertijd, jaarwisseling, reizen; plus een
  integratietest tegen Postgres (`LEARNING_TEST_DATABASE_URL`) voor de reeks.
- `npm run test:conference`: conferentiedata en -status.
