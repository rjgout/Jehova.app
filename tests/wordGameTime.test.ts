import test from "node:test";
import assert from "node:assert/strict";
import { amsterdamNow } from "../src/lib/dates";
import { dayKeyInZone } from "../src/lib/timeZone";
import { streakDayGap } from "../src/lib/learning/streakRules";
import { getWordForDay, wordDayClosesAt, wordGameDayKey, wordGamePeriod } from "../src/lib/wordGame";

const AMS = "Europe/Amsterdam";
const NY = "America/New_York";
const LA = "America/Los_Angeles";
const TOKYO = "Asia/Tokyo";
const SYDNEY = "Australia/Sydney";
const at = (iso: string) => new Date(iso);

// De oude implementatie (vóór de tijdzones), letterlijk overgenomen: voor
// Nederland moet de nieuwe exact hetzelfde geven.
function oldWordGameDayKey(date: Date): string {
  const { year, month, day, hour } = amsterdamNow(date);
  const noonUtc = Date.UTC(year, month - 1, day, 12);
  const shifted = hour < 18 ? noonUtc - 24 * 60 * 60 * 1000 : noonUtc;
  const d = new Date(shifted);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

test("Nederland: identiek aan de oude 18:00-regel (een jaar lang, elk kwartier)", () => {
  const start = Date.parse("2026-01-01T00:00:00Z");
  for (let t = start; t < start + 366 * 86_400_000; t += 15 * 60_000) {
    const d = new Date(t);
    assert.equal(wordGameDayKey(d, AMS), oldWordGameDayKey(d), d.toISOString());
  }
  // Zonder bekende tijdzone (standaard) ook.
  assert.equal(wordGameDayKey(at("2026-10-02T16:00:00Z")), "2026-10-02");
});

test("17:59 oud woord, 18:00 en 18:01 nieuw woord, in vijf tijdzones", () => {
  // [tijdzone, 2 okt. 18:00 lokaal in UTC]
  const cases: [string, string][] = [
    [AMS, "2026-10-02T16:00:00Z"],
    [NY, "2026-10-02T22:00:00Z"],
    [LA, "2026-10-03T01:00:00Z"],
    [TOKYO, "2026-10-02T09:00:00Z"],
    [SYDNEY, "2026-10-02T08:00:00Z"],
  ];
  for (const [zone, sixIso] of cases) {
    const six = Date.parse(sixIso);
    assert.equal(wordGameDayKey(new Date(six - 60_000), zone), "2026-10-01", `${zone} 17:59`);
    assert.equal(wordGameDayKey(new Date(six), zone), "2026-10-02", `${zone} 18:00`);
    assert.equal(wordGameDayKey(new Date(six + 60_000), zone), "2026-10-02", `${zone} 18:01`);
    const period = wordGamePeriod(new Date(six + 60_000), zone);
    assert.equal(period.releasedAt.toISOString(), new Date(six).toISOString(), `${zone} releasedAt`);
    assert.equal(period.nextReleaseAt.getTime() - six, 24 * 3_600_000, `${zone} nextReleaseAt`);
  }
});

test("zelfde woordvolgorde in elke tijdzone; alleen het moment verschilt", () => {
  // 2 okt. 19:00 lokaal in vijf tijdzones (vijf verschillende absolute
  // momenten): overal dezelfde woorddag en dus hetzelfde woord.
  const sevenPm: [string, string][] = [
    [AMS, "2026-10-02T17:00:00Z"],
    [NY, "2026-10-02T23:00:00Z"],
    [LA, "2026-10-03T02:00:00Z"],
    [TOKYO, "2026-10-02T10:00:00Z"],
    [SYDNEY, "2026-10-02T09:00:00Z"],
  ];
  const word = getWordForDay("2026-10-02");
  for (const [zone, iso] of sevenPm) {
    const key = wordGameDayKey(at(iso), zone);
    assert.equal(key, "2026-10-02", zone);
    assert.equal(getWordForDay(key), word, zone);
  }
  // De volgorde zelf is onveranderd: opeenvolgende woorddagen, opeenvolgende woorden.
  assert.notEqual(getWordForDay("2026-10-03"), undefined);
});

test("zomer- en wintertijd: 18:00 blijft 18:00 lokaal", () => {
  // Nederland, rond 25 okt. 2026 (+2 -> +1): 24 okt. 16:00Z, 25 okt. 17:00Z.
  assert.equal(wordGamePeriod(at("2026-10-24T16:30:00Z"), AMS).releasedAt.toISOString(), "2026-10-24T16:00:00.000Z");
  const p = wordGamePeriod(at("2026-10-25T16:30:00Z"), AMS);
  assert.equal(p.dayKey, "2026-10-24"); // 17:30 lokaal: nog het oude woord
  assert.equal(p.nextReleaseAt.toISOString(), "2026-10-25T17:00:00.000Z"); // 25 uur na de vorige
  // New York, 8 mrt. 2026 (-5 -> -4): 7 mrt. 23:00Z, 8 mrt. 22:00Z.
  const ny = wordGamePeriod(at("2026-03-08T12:00:00Z"), NY);
  assert.equal(ny.releasedAt.toISOString(), "2026-03-07T23:00:00.000Z");
  assert.equal(ny.nextReleaseAt.toISOString(), "2026-03-08T22:00:00.000Z"); // 23 uur
  // Sydney, 4 okt. 2026 (+10 -> +11).
  assert.equal(wordGamePeriod(at("2026-10-04T08:00:00Z"), SYDNEY).releasedAt.toISOString(), "2026-10-04T07:00:00.000Z");
});

test("jaarwisseling", () => {
  assert.equal(wordGameDayKey(at("2026-12-31T16:59:00Z"), AMS), "2026-12-30");
  assert.equal(wordGameDayKey(at("2026-12-31T17:00:00Z"), AMS), "2026-12-31");
  assert.equal(wordGameDayKey(at("2027-01-01T08:59:00Z"), TOKYO), "2026-12-31");
  assert.equal(wordGameDayKey(at("2027-01-01T09:00:00Z"), TOKYO), "2027-01-01");
  assert.equal(wordGamePeriod(at("2026-12-31T20:00:00Z"), AMS).nextReleaseAt.toISOString(), "2027-01-01T17:00:00.000Z");
});

test("reizen: de woorddag volgt de huidige tijdzone", () => {
  const moment = at("2026-10-02T17:30:00Z"); // NL 19:30, NY 13:30, Tokio 3 okt. 02:30
  assert.equal(wordGameDayKey(moment, AMS), "2026-10-02");
  assert.equal(wordGameDayKey(moment, NY), "2026-10-01"); // naar het westen: tijdelijk de vorige woorddag
  assert.equal(wordGameDayKey(moment, TOKYO), "2026-10-02");
});

test("de 18:00-regel raakt de gewone kalenderdag (reeks, Vandaag) niet", () => {
  const moment = at("2026-10-02T16:30:00Z"); // NL 18:30
  assert.equal(wordGameDayKey(moment, AMS), "2026-10-02");
  assert.equal(dayKeyInZone(moment, AMS), "2026-10-02");
  const evening = at("2026-10-02T21:30:00Z"); // NL 23:30: woorddag al 2 okt., kalenderdag ook nog 2 okt.
  assert.equal(dayKeyInZone(evening, AMS), "2026-10-02");
  // Reeks: om 18:00 begint geen nieuwe reeksdag, pas om 00:00.
  const state = { lastStudyDate: "2026-10-02", lastStudyTimeZone: AMS, timeZone: AMS };
  assert.equal(streakDayGap(state, at("2026-10-02T16:01:00Z")).gap, 0);
  assert.equal(streakDayGap(state, at("2026-10-02T21:59:00Z")).gap, 0);
  assert.equal(streakDayGap(state, at("2026-10-02T22:00:00Z")).gap, 1);
});

test("de rangbonus wacht tot de woorddag in elke tijdzone voorbij is", () => {
  const closes = wordDayClosesAt("2026-10-02");
  assert.equal(closes.toISOString(), "2026-10-04T06:00:00.000Z");
  const zones = ["Etc/GMT+12", "Pacific/Pago_Pago", "Pacific/Honolulu", LA, NY, AMS, TOKYO, SYDNEY, "Pacific/Kiritimati"];
  // Eén minuut ervoor kan iemand in UTC-12 nog voor 2 okt. raden ...
  assert.equal(wordGameDayKey(new Date(closes.getTime() - 60_000), "Etc/GMT+12"), "2026-10-02");
  // ... daarna niemand meer, waar ook ter wereld.
  for (const zone of zones) assert.ok(wordGameDayKey(closes, zone) > "2026-10-02", zone);
});
