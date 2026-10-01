import test from "node:test";
import assert from "node:assert/strict";
import { addDays } from "../src/lib/dates";
import { dayKeyInZone } from "../src/lib/timeZone";
import {
  COUNTDOWN_WINDOW_DAYS,
  generalConferenceDates,
  getCurrentOrNextSession,
  getDaysUntilGeneralConference,
  getFollowingGeneralConference,
  getGeneralConferenceStatus,
  getNextGeneralConference,
  isGeneralConferenceActive,
  shouldShowGeneralConferenceCountdown,
  splitMinutes,
  type GeneralConference,
} from "../src/lib/generalConference";

const AMS = "Europe/Amsterdam";
const at = (iso: string) => new Date(iso);
const status = (iso: string, zone = AMS, dates?: readonly GeneralConference[]) => getGeneralConferenceStatus(at(iso), zone, dates);

test("de data: chronologisch, za+zo, sessies binnen het weekend en op volgorde", () => {
  let previous = "";
  for (const c of generalConferenceDates) {
    assert.ok(c.start > previous, `${c.start} staat niet op volgorde`);
    assert.equal(new Date(`${c.start}T12:00:00Z`).getUTCDay(), 6, `${c.start} is geen zaterdag`);
    assert.equal(addDays(c.start, 1), c.end);
    const sunday = new Date(`${c.end}T12:00:00Z`);
    assert.ok(sunday.getUTCDate() <= 7 && [3, 9].includes(sunday.getUTCMonth()), `${c.end}: niet de eerste zondag van april/oktober`);
    let lastEnd = 0;
    for (const s of c.sessions ?? []) {
      const start = Date.parse(s.start);
      const end = Date.parse(s.end);
      assert.ok(start < end && start >= lastEnd, `${c.start}: sessies niet op volgorde`);
      assert.ok([c.start, c.end].includes(dayKeyInZone(new Date(start), "America/Denver")), `${s.start}: valt niet in het weekend (Salt Lake City)`);
      lastEnd = end;
    }
    // Sessietijden alleen bij officieel aangekondigde conferenties.
    if (c.sessions) assert.equal(c.status, "official");
    previous = c.end;
  }
  assert.ok(generalConferenceDates.at(-1)!.start >= "2036-04-01", "minstens tien jaar vooruit");
  assert.deepEqual(generalConferenceDates.filter((c) => c.status === "official").map((c) => c.start), ["2026-10-03", "2027-04-03", "2027-10-02"]);
  // Oktober 2026: 10:00 en 14:00 MDT = 16:00 en 20:00 UTC = 18:00 en 22:00 in Nederland.
  assert.deepEqual(generalConferenceDates[0].sessions!.map((s) => s.start), ["2026-10-03T16:00:00Z", "2026-10-03T20:00:00Z", "2026-10-04T16:00:00Z", "2026-10-04T20:00:00Z"]);
});

test("61 dagen vooraf niet zichtbaar, 60 wel (lokale kalenderdag van de eerste sessie)", () => {
  // April 2027: eerste sessie 3 apr. 16:00 UTC = 18:00 in Nederland, dus lokale dag 3 apr.
  assert.equal(status("2027-02-01T12:00:00Z"), null);
  assert.equal(shouldShowGeneralConferenceCountdown(at("2027-02-01T12:00:00Z"), AMS), false);
  assert.deepEqual(status("2027-02-02T12:00:00Z"), { kind: "days", days: COUNTDOWN_WINDOW_DAYS });
  // In Tokio is de eerste sessie pas op 4 apr. (01:00): daar verschijnt hij een dag later.
  assert.equal(status("2027-02-02T12:00:00Z", "Asia/Tokyo"), null);
  assert.deepEqual(status("2027-02-03T12:00:00Z", "Asia/Tokyo"), { kind: "days", days: 60 });
});

test("dagen, morgen en vandaag vóór de eerste sessie, met lokale aanvangstijd", () => {
  assert.deepEqual(status("2026-10-01T10:00:00Z"), { kind: "days", days: 2 });
  assert.deepEqual(status("2026-10-02T10:00:00Z"), { kind: "tomorrow", at: "2026-10-03T16:00:00Z" });
  assert.deepEqual(status("2026-10-03T08:00:00Z"), { kind: "today", at: "2026-10-03T16:00:00Z" });
  assert.deepEqual(status("2026-10-03T15:59:00Z"), { kind: "today", at: "2026-10-03T16:00:00Z" });
});

test("sessies: begin, bezig, einde, tussen sessies en de volgende", () => {
  assert.deepEqual(status("2026-10-03T16:00:00Z"), { kind: "live" }); // exact begin eerste sessie
  assert.equal(isGeneralConferenceActive(at("2026-10-03T16:00:00Z"), AMS), true);
  assert.deepEqual(status("2026-10-03T17:15:00Z"), { kind: "live" });
  assert.deepEqual(status("2026-10-03T17:59:00Z"), { kind: "live" });
  // Einde eerste sessie: volgende over 2 uur.
  assert.deepEqual(status("2026-10-03T18:00:00Z"), { kind: "next", minutes: 120, at: "2026-10-03T20:00:00Z" });
  assert.deepEqual(status("2026-10-03T18:46:00Z"), { kind: "next", minutes: 74, at: "2026-10-03T20:00:00Z" }); // 1u 14m
  assert.deepEqual(status("2026-10-03T19:26:00Z"), { kind: "next", minutes: 34, at: "2026-10-03T20:00:00Z" }); // alleen minuten
  assert.deepEqual(status("2026-10-03T19:59:30Z"), { kind: "next", minutes: 1, at: "2026-10-03T20:00:00Z" }); // nooit "over 0m"
  assert.deepEqual(status("2026-10-03T20:00:00Z"), { kind: "live" }); // begin volgende sessie
  // 's Nachts tussen zaterdag en zondag.
  assert.deepEqual(status("2026-10-03T22:30:00Z"), { kind: "next", minutes: 17 * 60 + 30, at: "2026-10-04T16:00:00Z" });
  assert.deepEqual(status("2026-10-04T21:59:00Z"), { kind: "live" }); // laatste sessie
  assert.deepEqual(getCurrentOrNextSession(at("2026-10-04T21:00:00Z"), AMS)?.live, true);
});

test("na de laatste sessie verdwijnt hij en wordt de volgende conferentie gekozen", () => {
  assert.equal(status("2026-10-04T22:00:00Z"), null);
  assert.equal(getNextGeneralConference(at("2026-10-04T22:00:00Z"), AMS)?.start, "2027-04-03");
  assert.equal(getFollowingGeneralConference(at("2026-10-04T22:00:00Z"), AMS)?.start, "2027-10-02");
  assert.equal(getDaysUntilGeneralConference(at("2026-10-05T10:00:00Z"), AMS), 180);
});

test("tijdzones: dezelfde sessie, eigen kalenderdag", () => {
  const moment = "2026-10-02T23:30:00Z"; // NL za 01:30, LA vr 16:30, Tokio za 08:30, Sydney za 09:30
  assert.deepEqual(status(moment, AMS), { kind: "today", at: "2026-10-03T16:00:00Z" });
  assert.deepEqual(status(moment, "America/Los_Angeles"), { kind: "tomorrow", at: "2026-10-03T16:00:00Z" });
  assert.deepEqual(status(moment, "America/New_York"), { kind: "tomorrow", at: "2026-10-03T16:00:00Z" });
  // Eerste sessie is in Tokio en Sydney pas op zondag 4 okt. (01:00 en 02:00).
  assert.deepEqual(status(moment, "Asia/Tokyo"), { kind: "tomorrow", at: "2026-10-03T16:00:00Z" });
  assert.deepEqual(status(moment, "Australia/Sydney"), { kind: "tomorrow", at: "2026-10-03T16:00:00Z" });
  // Tijdens een sessie is het overal "bezig".
  for (const zone of [AMS, "America/Los_Angeles", "Asia/Tokyo", "Australia/Sydney"]) assert.deepEqual(status("2026-10-04T21:00:00Z", zone), { kind: "live" });
});

test("conferentie zonder sessietijden: op datum, het hele weekend 'vandaag'", () => {
  // April 2028 heeft (nog) geen sessietijden.
  assert.deepEqual(status("2028-03-30T10:00:00Z"), { kind: "days", days: 2 });
  assert.deepEqual(status("2028-03-31T10:00:00Z"), { kind: "tomorrow", at: null });
  assert.deepEqual(status("2028-04-01T10:00:00Z"), { kind: "today", at: null });
  assert.deepEqual(status("2028-04-02T20:00:00Z"), { kind: "today", at: null });
  assert.equal(status("2028-04-03T10:00:00Z"), null);
});

test("jaarwisseling en het einde van de lijst", () => {
  assert.equal(getDaysUntilGeneralConference(at("2026-12-31T12:00:00Z"), AMS), 93);
  const newYear: GeneralConference[] = [{ start: "2030-01-05", end: "2030-01-06", status: "expected" }];
  assert.deepEqual(status("2030-01-03T12:00:00Z", AMS, newYear), { kind: "days", days: 2 });
  assert.deepEqual(status("2029-12-31T23:30:00Z", AMS, newYear), { kind: "days", days: 4 }); // NL al 1 jan.
  assert.equal(status("2099-01-01T00:00:00Z"), null);
});

test("compacte duur", () => {
  assert.deepEqual(splitMinutes(134), { hours: 2, minutes: 14 });
  assert.deepEqual(splitMinutes(38), { hours: 0, minutes: 38 });
  assert.deepEqual(splitMinutes(120), { hours: 2, minutes: 0 });
});
