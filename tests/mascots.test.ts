import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MASCOT_CHARACTERS, MASCOT_STATES, mascotStates, registeredStaticMascots, staticMascotAsset, staticMascotPath } from "../src/lib/mascots";

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const STATIC_DIR = path.join(PUBLIC, "mascots", "static");
const FIGMA_NOVI_DIR = path.join(PUBLIC, "mascots", "figma", "novi");

// Breedte en hoogte uit de WebP-header (VP8X, VP8L of VP8), zodat de
// geregistreerde afmetingen altijd met het echte bestand overeenkomen.
function webpSize(file: string): { width: number; height: number } {
  const b = readFileSync(file);
  assert.equal(b.toString("ascii", 0, 4), "RIFF", `${file}: geen RIFF`);
  assert.equal(b.toString("ascii", 8, 12), "WEBP", `${file}: geen WebP`);
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
}

test("elk geregistreerd mascottebestand bestaat echt", () => {
  for (const { character, state, asset } of registeredStaticMascots()) {
    assert.equal(asset.src, staticMascotPath(character, state));
    assert.ok(existsSync(path.join(PUBLIC, asset.src)), `${asset.src} ontbreekt in public/`);
    assert.deepEqual({ width: asset.width, height: asset.height }, webpSize(path.join(PUBLIC, asset.src)), `${asset.src}: afmetingen in het register kloppen niet`);
  }
});

test("elk bestand in public/mascots/static volgt de naamconventie", () => {
  const characters = new Set<string>(MASCOT_CHARACTERS);
  for (const character of readdirSync(STATIC_DIR)) {
    assert.ok(characters.has(character), `static/${character}/: onbekend personage`);
    const states = new Set<string>(mascotStates(character as (typeof MASCOT_CHARACTERS)[number]));
    for (const file of readdirSync(path.join(STATIC_DIR, character))) {
      if (file === ".gitkeep") continue;
      const match = new RegExp(`^${character}-([a-z]+)\\.webp$`).exec(file);
      assert.ok(match, `${character}/${file}: verwacht ${character}-<state>.webp`);
      assert.ok(states.has(match[1]), `${character}/${file}: onbekende state "${match[1]}"`);
    }
  }
});

test("zonder bestand is er geen asset (en dus geen vervanger)", () => {
  // Varo en Vera hebben in deze fase bewust nog niets.
  for (const state of MASCOT_STATES) {
    assert.equal(staticMascotAsset("vera", state), null);
    assert.equal(staticMascotAsset("varo", state), null);
  }
  assert.equal(staticMascotAsset("family", "celebrate"), null, "family-celebrate is gereserveerd en heeft nog geen asset");
  assert.equal(staticMascotPath("novi", "greeting"), "/mascots/static/novi/novi-greeting.webp");
  assert.equal(staticMascotPath("family", "welcome"), "/mascots/static/family/family-welcome.webp");
});

test("Figma-kopieën van alle Novi-states volgen bron, formaat en verhouding", () => {
  const expectedFiles = MASCOT_STATES.map((state) => `novi-${state}.webp`).sort();
  assert.deepEqual(readdirSync(path.join(FIGMA_NOVI_DIR, "512")).sort(), expectedFiles);
  assert.deepEqual(readdirSync(path.join(FIGMA_NOVI_DIR, "256")).sort(), expectedFiles);

  for (const state of MASCOT_STATES) {
    const source = path.join(STATIC_DIR, "novi", `novi-${state}.webp`);
    const copy512 = path.join(FIGMA_NOVI_DIR, "512", `novi-${state}.webp`);
    const copy256 = path.join(FIGMA_NOVI_DIR, "256", `novi-${state}.webp`);
    const sourceSize = webpSize(source);
    const size512 = webpSize(copy512);
    const size256 = webpSize(copy256);

    assert.deepEqual(size512, sourceSize, `${state}: 512-kopie veranderde de canvasmaat`);
    assert.deepEqual(readFileSync(copy512), readFileSync(source), `${state}: 512-kopie is niet byte-identiek aan productie`);
    assert.equal(Math.max(size256.width, size256.height), 256, `${state}: 256-export heeft niet de bedoelde langste zijde`);
    assert.equal(size256.width * sourceSize.height, size256.height * sourceSize.width, `${state}: 256-export veranderde de verhouding`);
    assert.ok(size256.width <= sourceSize.width && size256.height <= sourceSize.height, `${state}: Figma-export is opgeschaald`);
  }
});
