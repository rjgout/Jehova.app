import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addDays, amsterdamDayKey } from "../src/lib/dates";
import {
  COUNTDOWN_WINDOW_DAYS,
  generalConferenceDates,
  getDaysUntilGeneralConference,
  getFollowingGeneralConference,
  getGeneralConferenceCountdown,
  getNextGeneralConference,
  isGeneralConferenceActive,
  shouldShowGeneralConferenceCountdown,
  type GeneralConference,
} from "../src/lib/generalConference";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OCT_2026 = "2026-10-03"; // zaterdag, eerste dag
const APR_2027 = "2027-04-03";

test("de data: chronologisch, za+zo, en de verwachte data volgen het vaste patroon", () => {
  let previous = "";
  for (const c of generalConferenceDates) {
    assert.ok(c.start > previous, `${c.start} staat niet op volgorde`);
    assert.equal(new Date(`${c.start}T12:00:00Z`).getUTCDay(), 6, `${c.start} is geen zaterdag`);
    assert.equal(addDays(c.start, 1), c.end, `${c.start}: einde is niet de dag erna`);
    const sunday = new Date(`${c.end}T12:00:00Z`);
    // Het weekend van de eerste zondag van april of oktober.
    assert.ok(sunday.getUTCDate() <= 7 && [3, 9].includes(sunday.getUTCMonth()), `${c.end} is niet de eerste zondag van april/oktober`);
    previous = c.end;
  }
  // Minstens tien jaar vooruit, en de aangekondigde data als officieel.
  assert.ok(generalConferenceDates.at(-1)!.start >= "2036-04-01");
  assert.deepEqual(
    generalConferenceDates.filter((c) => c.status === "official").map((c) => c.start),
    ["2026-10-03", "2027-04-03", "2027-10-02"]
  );
});

test("61 dagen vooraf niet zichtbaar, 60 dagen vooraf wel", () => {
  assert.equal(shouldShowGeneralConferenceCountdown(addDays(APR_2027, -61)), false);
  assert.equal(getGeneralConferenceCountdown(addDays(APR_2027, -61)), null);
  assert.equal(shouldShowGeneralConferenceCountdown(addDays(APR_2027, -60)), true);
  assert.deepEqual(getGeneralConferenceCountdown(addDays(APR_2027, -60)), { kind: "days", days: COUNTDOWN_WINDOW_DAYS });
});

test("2 dagen, morgen, vandaag", () => {
  assert.deepEqual(getGeneralConferenceCountdown("2026-10-01"), { kind: "days", days: 2 });
  assert.deepEqual(getGeneralConferenceCountdown("2026-10-02"), { kind: "tomorrow" });
  assert.deepEqual(getGeneralConferenceCountdown(OCT_2026), { kind: "today" });
});

test("tijdens het conferentieweekend zichtbaar, daarna weg en de volgende geselecteerd", () => {
  for (const day of ["2026-10-03", "2026-10-04"]) {
    assert.equal(isGeneralConferenceActive(day), true, day);
    assert.deepEqual(getGeneralConferenceCountdown(day), { kind: "today" }, day);
    assert.equal(getNextGeneralConference(day)?.start, OCT_2026);
    assert.ok(getDaysUntilGeneralConference(day)! <= 0);
  }
  // Maandag na de conferentie: de countdown is weg, april 2027 is de volgende.
  assert.equal(isGeneralConferenceActive("2026-10-05"), false);
  assert.equal(getGeneralConferenceCountdown("2026-10-05"), null);
  assert.equal(getNextGeneralConference("2026-10-05")?.start, APR_2027);
  assert.equal(getFollowingGeneralConference("2026-10-05")?.start, "2027-10-02");
  assert.equal(getFollowingGeneralConference(OCT_2026)?.start, APR_2027);
});

test("jaarwisseling: dagen tellen over 31 december heen", () => {
  assert.equal(getDaysUntilGeneralConference("2026-12-31"), 93);
  assert.equal(getGeneralConferenceCountdown("2026-12-31"), null);
  // Met een conferentie vlak na nieuwjaar (testdata): 31 dec = over 2 dagen.
  const newYear: GeneralConference[] = [{ start: "2030-01-02", end: "2030-01-03", status: "expected" }];
  assert.deepEqual(getGeneralConferenceCountdown("2029-12-31", newYear), { kind: "days", days: 2 });
  assert.deepEqual(getGeneralConferenceCountdown("2030-01-01", newYear), { kind: "tomorrow" });
  // Schrikkeljaar 2028: 1 februari tot 1 april = 60 dagen.
  assert.equal(getDaysUntilGeneralConference("2028-02-01"), 60);
  assert.equal(shouldShowGeneralConferenceCountdown("2028-01-31"), false);
});

test("na de laatste bekende conferentie: niets, geen fout", () => {
  assert.equal(getNextGeneralConference("2099-01-01"), null);
  assert.equal(getGeneralConferenceCountdown("2099-01-01"), null);
  assert.equal(isGeneralConferenceActive("2099-01-01"), false);
});

test("tijdzones: de kalenderdag van de gebruiker bepaalt vandaag/morgen", () => {
  // Hetzelfde moment, drie plekken op aarde, elk in een eigen proces met TZ.
  const dayIn = (tz: string, iso: string) =>
    execFileSync(path.join(ROOT, "node_modules/.bin/tsx"), ["-e", `import { localDayKey } from "./src/lib/generalConference"; process.stdout.write(localDayKey(new Date("${iso}")));`], {
      cwd: ROOT,
      env: { ...process.env, TZ: tz },
    }).toString();

  // Vrijdag 2 okt. 23:30 UTC: in Nederland en Nieuw-Zeeland al zaterdag, in Los Angeles nog vrijdag.
  const friday = "2026-10-02T23:30:00Z";
  assert.deepEqual(getGeneralConferenceCountdown(dayIn("Europe/Amsterdam", friday)), { kind: "today" });
  assert.deepEqual(getGeneralConferenceCountdown(dayIn("Pacific/Auckland", friday)), { kind: "today" });
  assert.deepEqual(getGeneralConferenceCountdown(dayIn("America/Los_Angeles", friday)), { kind: "tomorrow" });

  // Zondag 4 okt. 23:30 UTC: in Los Angeles nog conferentiedag, in Nederland al maandag (weg).
  const sunday = "2026-10-04T23:30:00Z";
  assert.deepEqual(getGeneralConferenceCountdown(dayIn("America/Los_Angeles", sunday)), { kind: "today" });
  assert.equal(getGeneralConferenceCountdown(dayIn("Europe/Amsterdam", sunday)), null);

  // Vlak na middernacht lokaal: de dag springt precies om middernacht.
  assert.equal(dayIn("Europe/Amsterdam", "2026-10-01T21:59:59Z"), "2026-10-01");
  assert.equal(dayIn("Europe/Amsterdam", "2026-10-01T22:00:00Z"), "2026-10-02");

  // De servergok (Nederlandse dag) hangt niet af van de tijdzone van de server.
  assert.equal(amsterdamDayKey(new Date("2026-10-01T22:30:00Z")), "2026-10-02");
});
