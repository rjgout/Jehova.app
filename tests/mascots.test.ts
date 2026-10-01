import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MASCOT_STATES, registeredStaticMascots, staticMascotAsset, staticMascotPath } from "../src/lib/mascots";

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const STATIC_DIR = path.join(PUBLIC, "mascots", "static");

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

// Composities van de drie samen hebben eigen states en (nog) geen plek in het
// register; zie public/mascots/README.md. "celebrate" is daar bewust iets
// anders dan "welcome": alleen voor betekenisvolle mijlpalen.
const FAMILY_STATES = ["welcome", "celebrate"];

test("elk bestand in public/mascots/static volgt de naamconventie", () => {
  for (const character of readdirSync(STATIC_DIR)) {
    const states = new Set<string>(character === "family" ? FAMILY_STATES : MASCOT_STATES);
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
  assert.equal(staticMascotPath("novi", "greeting"), "/mascots/static/novi/novi-greeting.webp");
});
