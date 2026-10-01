import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_TIME_ZONE,
  dayKeyInZone,
  hhmmInZone,
  isValidTimeZone,
  localDayRange,
  resolveTimeZone,
  startOfLocalDay,
  userDayKey,
  zoneOffsetMinutes,
} from "../src/lib/timeZone";
import { hasStudiedToday, streakDayGap, type StreakDayState } from "../src/lib/learning/streakRules";

const AMS = "Europe/Amsterdam";
const NY = "America/New_York";
const LA = "America/Los_Angeles";
const TOKYO = "Asia/Tokyo";
const SYDNEY = "Australia/Sydney";

test("geldige IANA-tijdzones; offsets en onzin worden geweigerd, met veilige standaard", () => {
  for (const zone of [AMS, NY, LA, TOKYO, SYDNEY, "UTC"]) assert.equal(isValidTimeZone(zone), true, zone);
  for (const bad of ["+01:00", "UTC+1", "Europe/Nergens", "", "   ", 42, null, "a".repeat(80)]) assert.equal(isValidTimeZone(bad), false, String(bad));
  assert.equal(resolveTimeZone(null), DEFAULT_TIME_ZONE);
  assert.equal(resolveTimeZone("+01:00"), DEFAULT_TIME_ZONE);
  assert.equal(resolveTimeZone(TOKYO), TOKYO);
  assert.equal(userDayKey({ timeZone: null }, new Date("2026-10-01T22:30:00Z")), "2026-10-02"); // standaard: Nederland
});

test("23:59 en 00:00 in vijf tijdzones", () => {
  const cases: [string, string, string][] = [
    // [tijdzone, laatste minuut van 1 okt. (UTC-moment), verwachte dag erna]
    [AMS, "2026-10-01T21:59:00Z", "2026-10-02"],
    [NY, "2026-10-02T03:59:00Z", "2026-10-02"],
    [LA, "2026-10-02T06:59:00Z", "2026-10-02"],
    [TOKYO, "2026-10-01T14:59:00Z", "2026-10-02"],
    [SYDNEY, "2026-10-01T13:59:00Z", "2026-10-02"],
  ];
  for (const [zone, lastMinute, next] of cases) {
    const d = new Date(lastMinute);
    assert.equal(hhmmInZone(d, zone), "23:59", zone);
    assert.equal(dayKeyInZone(d, zone), "2026-10-01", zone);
    const midnight = new Date(d.getTime() + 60_000);
    assert.equal(hhmmInZone(midnight, zone), "00:00", zone);
    assert.equal(dayKeyInZone(midnight, zone), next, zone);
    assert.equal(startOfLocalDay(next, zone).toISOString(), midnight.toISOString(), `${zone}: begin van de dag`);
  }
});

test("zomer- en wintertijd: offsets en daglengte (23 en 25 uur)", () => {
  // Nederland: 29 mrt. 2026 (+1 -> +2), 25 okt. 2026 (+2 -> +1).
  assert.equal(zoneOffsetMinutes(new Date("2026-03-29T00:30:00Z"), AMS), 60);
  assert.equal(zoneOffsetMinutes(new Date("2026-03-29T01:30:00Z"), AMS), 120);
  const spring = localDayRange("2026-03-29", AMS);
  assert.equal((spring.end.getTime() - spring.start.getTime()) / 3_600_000, 23);
  const autumn = localDayRange("2026-10-25", AMS);
  assert.equal((autumn.end.getTime() - autumn.start.getTime()) / 3_600_000, 25);
  // VS: 8 mrt. en 1 nov. 2026.
  assert.equal((localDayRange("2026-03-08", NY).end.getTime() - localDayRange("2026-03-08", NY).start.getTime()) / 3_600_000, 23);
  assert.equal((localDayRange("2026-11-01", LA).end.getTime() - localDayRange("2026-11-01", LA).start.getTime()) / 3_600_000, 25);
  // Sydney (zuidelijk halfrond): 5 apr. 2026 terug, 4 okt. 2026 vooruit.
  assert.equal((localDayRange("2026-04-05", SYDNEY).end.getTime() - localDayRange("2026-04-05", SYDNEY).start.getTime()) / 3_600_000, 25);
  assert.equal((localDayRange("2026-10-04", SYDNEY).end.getTime() - localDayRange("2026-10-04", SYDNEY).start.getTime()) / 3_600_000, 23);
  // Tokio kent geen zomertijd.
  assert.equal((localDayRange("2026-03-29", TOKYO).end.getTime() - localDayRange("2026-03-29", TOKYO).start.getTime()) / 3_600_000, 24);
  // Rond de wissel blijft de kalenderdag kloppen.
  assert.equal(dayKeyInZone(new Date("2026-10-24T22:30:00Z"), AMS), "2026-10-25");
  assert.equal(dayKeyInZone(new Date("2026-10-25T22:59:00Z"), AMS), "2026-10-25");
  assert.equal(dayKeyInZone(new Date("2026-10-25T23:00:00Z"), AMS), "2026-10-26");
});

test("jaarwisseling", () => {
  assert.equal(dayKeyInZone(new Date("2026-12-31T22:59:00Z"), AMS), "2026-12-31");
  assert.equal(dayKeyInZone(new Date("2026-12-31T23:00:00Z"), AMS), "2027-01-01");
  assert.equal(dayKeyInZone(new Date("2026-12-31T23:00:00Z"), NY), "2026-12-31");
  assert.equal(dayKeyInZone(new Date("2026-12-31T15:00:00Z"), TOKYO), "2027-01-01");
  assert.equal(startOfLocalDay("2027-01-01", SYDNEY).toISOString(), "2026-12-31T13:00:00.000Z");
});

// --- Reeks: reizen en tijdzonewissels ---------------------------------------

const at = (iso: string) => new Date(iso);
function state(lastStudyDate: string | null, lastStudyTimeZone: string | null, timeZone: string | null): StreakDayState {
  return { lastStudyDate, lastStudyTimeZone, timeZone };
}

test("zonder reizen: gewone dagen in je eigen tijdzone", () => {
  const s = state("2026-10-01", AMS, AMS);
  assert.deepEqual(streakDayGap(s, at("2026-10-01T21:59:00Z")), { today: "2026-10-01", gap: 0 }); // 23:59
  assert.deepEqual(streakDayGap(s, at("2026-10-01T22:00:00Z")), { today: "2026-10-02", gap: 1 }); // 00:00
  assert.deepEqual(streakDayGap(s, at("2026-10-03T10:00:00Z")), { today: "2026-10-03", gap: 2 }); // 1 dag gemist
  assert.equal(streakDayGap(state(null, null, AMS), at("2026-10-01T10:00:00Z")).gap, null);
});

test("Amsterdam -> New York: geen extra dag, geen verlies", () => {
  // Gestudeerd om 01:00 op 2 okt. in Amsterdam; daarna naar New York, waar het nog 1 okt. is.
  const s = state("2026-10-02", AMS, NY);
  assert.equal(hasStudiedToday(s, at("2026-10-02T00:00:00Z")), true); // NY 1 okt. 20:00: telt al
  assert.equal(streakDayGap(s, at("2026-10-02T14:00:00Z")).gap, 0); // NY 2 okt. 10:00: zelfde datum, geen nieuwe dag
  assert.equal(streakDayGap(s, at("2026-10-03T13:00:00Z")).gap, 1); // NY 3 okt.: gewoon de volgende dag
  // Nooit gemist zolang hij in New York op 3 okt. studeert:
  assert.ok(streakDayGap(s, at("2026-10-04T03:59:00Z")).gap! <= 1);
});

test("New York -> Amsterdam: de vooruitgesprongen datum geeft geen gratis dag", () => {
  // Gestudeerd in New York op 1 okt. om 22:00 (in Amsterdam al 2 okt. 04:00).
  const s = state("2026-10-01", NY, AMS);
  assert.equal(streakDayGap(s, at("2026-10-02T03:00:00Z")).gap, 0); // AMS 2 okt. 05:00, NY nog 1 okt.: geen nieuwe dag
  assert.equal(streakDayGap(s, at("2026-10-02T10:00:00Z")).gap, 1); // AMS 2 okt. 12:00, NY ook 2 okt.: wel
  // En niet gemist: de dag van 2 okt. is in New York pas om 06:00 UTC op 3 okt. voorbij.
  assert.equal(streakDayGap(s, at("2026-10-02T23:30:00Z")).gap, 1); // AMS al 3 okt., NY nog 2 okt.
});

test("Amsterdam -> Tokio: niet twee dagen binnen één Amsterdamse dag", () => {
  const s = state("2026-10-02", AMS, TOKYO); // gestudeerd AMS 2 okt. 22:00 (Tokio 3 okt. 05:00)
  assert.equal(streakDayGap(s, at("2026-10-02T21:00:00Z")).gap, 0); // Tokio 3 okt. 06:00, AMS nog 2 okt. 23:00
  assert.equal(streakDayGap(s, at("2026-10-02T23:00:00Z")).gap, 1); // AMS 3 okt. 01:00: echte nieuwe dag
});

test("Tokio -> Los Angeles: terug in de datum, geen extra en geen gemiste dag", () => {
  const s = state("2026-10-03", TOKYO, LA); // gestudeerd Tokio 3 okt. 08:00 (LA 2 okt. 16:00)
  assert.equal(hasStudiedToday(s, at("2026-10-03T03:00:00Z")), true); // LA 2 okt. 20:00
  assert.equal(streakDayGap(s, at("2026-10-03T17:00:00Z")).gap, 0); // LA 3 okt. 10:00: zelfde datum
  assert.equal(streakDayGap(s, at("2026-10-04T07:30:00Z")).gap, 1); // LA 4 okt. 00:30: niet gemist
  assert.equal(streakDayGap(s, at("2026-10-04T16:00:00Z")).gap, 1); // LA 4 okt. 09:00: volgende dag
});

test("bestaande reeksen (UTC-dag, zonder opgeslagen tijdzone) blijven intact", () => {
  // Oude dag-bucket was UTC: om 01:30 Nederlandse tijd op 2 okt. gestudeerd = "2026-10-01".
  const legacy = state("2026-10-01", null, null);
  // Na de overgang (standaard Amsterdam) om 00:30 op 3 okt. Nederlandse tijd: nog niet gemist.
  assert.equal(streakDayGap(legacy, at("2026-10-02T22:30:00Z")).gap, 1);
  // Pas als de dag ook als UTC-dag voorbij is, telt hij als gemist (zoals vroeger).
  assert.equal(streakDayGap(legacy, at("2026-10-03T00:30:00Z")).gap, 2);
  // Vandaag-check voor oude gegevens: gelijk aan het oude gedrag.
  assert.equal(hasStudiedToday(legacy, at("2026-10-01T12:00:00Z")), true);
});

test("een verzette tijdzone levert nooit een tweede dag op dezelfde dag op", () => {
  // Gestudeerd om 23:00 in Amsterdam; toestel naar Kiritimati (UTC+14), waar het al morgen is.
  const s = state("2026-10-02", AMS, "Pacific/Kiritimati");
  assert.equal(streakDayGap(s, at("2026-10-02T21:30:00Z")).gap, 0);
  // Terug naar Amsterdam: ook niets.
  assert.equal(streakDayGap(state("2026-10-02", AMS, AMS), at("2026-10-02T21:30:00Z")).gap, 0);
});
