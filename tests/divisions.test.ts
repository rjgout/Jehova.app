// De officiële divisie-emblemen (TIER_EMBLEMS in src/lib/leagues.ts): elke
// bestaande divisie precies één, als echt WebP-bestand met alfa.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TIER_EMBLEMS, TIER_LABELS, TIER_ORDER } from "../src/lib/leagues";

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

test("acht divisies, in de bestaande volgorde, elk met een eigen embleem", () => {
  assert.deepEqual(TIER_ORDER, ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER", "GRANDMASTER", "LEGEND"]);
  assert.deepEqual(Object.keys(TIER_EMBLEMS).sort(), [...TIER_ORDER].sort());
  assert.equal(new Set(Object.values(TIER_EMBLEMS)).size, 8, "geen twee divisies met hetzelfde embleem");
  // De namen zelf veranderen niet mee met het beeld.
  assert.deepEqual(TIER_ORDER.map((tier) => TIER_LABELS[tier]), ["Zaad", "Licht", "Strijder", "Rots", "Erfgenaam", "Overvloed", "Zion", "Eeuwigheid"]);
});

test("elk embleem is een bestaand WebP-bestand met alfa, 384x384", () => {
  for (const tier of TIER_ORDER) {
    const src = TIER_EMBLEMS[tier];
    assert.equal(src, `/icons/divisions/${tier.toLowerCase()}.webp`);
    const file = path.join(PUBLIC, src);
    assert.ok(existsSync(file), `${src} ontbreekt`);
    const b = readFileSync(file);
    assert.equal(b.toString("ascii", 0, 4), "RIFF");
    assert.equal(b.toString("ascii", 8, 12), "WEBP");
    assert.equal(b.toString("ascii", 12, 16), "VP8X", `${tier}: geen uitgebreide WebP`);
    assert.ok((b[20] & 0x10) !== 0, `${tier}: zonder alfakanaal`);
    assert.deepEqual([1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)], [384, 384], `${tier}: verwacht 384x384`);
  }
});

test("in de map staan alleen de acht emblemen", () => {
  const files = readdirSync(path.join(PUBLIC, "icons", "divisions")).sort();
  assert.deepEqual(files, TIER_ORDER.map((tier) => `${tier.toLowerCase()}.webp`).sort());
});
