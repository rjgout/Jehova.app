import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_PERSONAL_MASCOT,
  MASCOT_CHARACTERS,
  MASCOT_STATES,
  PERSONAL_MASCOTS,
  isPersonalMascot,
  mascotStates,
  mascotVariantCount,
  registeredStaticMascots,
  staticMascotAsset,
  staticMascotPath,
} from "../src/lib/mascots";

// Een combinatie die niet bestaat, is al een typefout (tsc controleert deze map ook).
// @ts-expect-error family heeft geen greeting
staticMascotPath("family", "greeting");

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const STATIC_DIR = path.join(PUBLIC, "mascots", "static");
const FIGMA_DIR = path.join(PUBLIC, "mascots", "figma");

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
  for (const { character, state, variant, asset } of registeredStaticMascots()) {
    assert.equal(asset.src, staticMascotPath(character, state, variant));
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
      const match = new RegExp(`^${character}-([a-z]+)(?:-(\\d+))?\\.webp$`).exec(file);
      assert.ok(match, `${character}/${file}: verwacht ${character}-<state>.webp of ${character}-<state>-<n>.webp`);
      assert.ok(states.has(match[1]), `${character}/${file}: onbekende state "${match[1]}"`);
      // Een genummerd bestand hoort bij een state met zoveel varianten, en omgekeerd.
      const count = mascotVariantCount(character as "family", match[1] as "welcome");
      if (match[2]) assert.ok(count > 1 && Number(match[2]) >= 1 && Number(match[2]) <= count, `${character}/${file}: variant ${match[2]} is niet geregistreerd`);
      else assert.ok(count <= 1, `${character}/${file}: deze state heeft varianten, verwacht ${character}-${match[1]}-<n>.webp`);
    }
  }
});

test("Novi, Varo en Vera: alle tien states geregistreerd als echte WebP met alfa", () => {
  for (const character of PERSONAL_MASCOTS) {
    assert.deepEqual([...mascotStates(character)].sort(), [...MASCOT_STATES].sort());
    for (const state of MASCOT_STATES) {
      const asset = staticMascotAsset(character, state);
      assert.ok(asset, `${character}-${state}: niet geregistreerd`);
      const file = path.join(PUBLIC, asset.src);
      const b = readFileSync(file);
      assert.equal(b.toString("ascii", 12, 16), "VP8X", `${character}-${state}: geen uitgebreide WebP`);
      assert.ok((b[20] & 0x10) !== 0, `${character}-${state}: WebP zonder alfakanaal`);
      assert.deepEqual(webpSize(file), { width: 512, height: 512 }, `${character}-${state}: verwacht 512x512`);
    }
  }
});

test("persoonlijke gids: alleen Novi, Varo en Vera; family blijft apart", () => {
  assert.deepEqual([...PERSONAL_MASCOTS], ["novi", "varo", "vera"]);
  assert.equal(DEFAULT_PERSONAL_MASCOT, "novi");
  for (const ok of ["novi", "varo", "vera"]) assert.equal(isPersonalMascot(ok), true);
  for (const wrong of ["family", "NOVI", "", null, undefined, 3, "lisa"]) assert.equal(isPersonalMascot(wrong), false);
  // family kent geen persoonlijke states, en geen andere dan welcome/celebrate.
  assert.deepEqual([...mascotStates("family")], ["welcome", "celebrate"]);
  assert.ok(!(mascotStates("family") as readonly string[]).includes("greeting"));
  assert.ok(staticMascotAsset("family", "welcome"), "family-welcome blijft geldig");
  assert.equal(staticMascotAsset("family", "celebrate"), null, "family-celebrate is gereserveerd en heeft nog geen asset");
  assert.equal(staticMascotPath("varo", "greeting"), "/mascots/static/varo/varo-greeting.webp");
  assert.equal(staticMascotPath("family", "welcome", 2), "/mascots/static/family/family-welcome-2.webp");
});

test("varianten: elke variant een eigen bestand, en een teller loopt rond", () => {
  assert.equal(mascotVariantCount("family", "welcome"), 3);
  assert.equal(mascotVariantCount("novi", "greeting"), 1);
  assert.equal(mascotVariantCount("family", "celebrate"), 0);
  assert.equal(staticMascotAsset("family", "welcome", 1)?.src, "/mascots/static/family/family-welcome-1.webp");
  assert.equal(staticMascotAsset("family", "welcome", 4)?.src, "/mascots/static/family/family-welcome-1.webp");
  assert.equal(staticMascotAsset("family", "welcome", 0)?.src, "/mascots/static/family/family-welcome-3.webp");
  assert.equal(staticMascotAsset("novi", "greeting", 2)?.src, "/mascots/static/novi/novi-greeting.webp", "zonder varianten telt het nummer niet");
});

test("Figma-kopieën van alle states van Novi, Varo en Vera volgen bron, formaat en verhouding", () => {
  for (const character of PERSONAL_MASCOTS) {
    const dir = path.join(FIGMA_DIR, character);
    const expectedFiles = MASCOT_STATES.map((state) => `${character}-${state}.webp`).sort();
    assert.deepEqual(readdirSync(path.join(dir, "512")).sort(), expectedFiles);
    assert.deepEqual(readdirSync(path.join(dir, "256")).sort(), expectedFiles);

    for (const state of MASCOT_STATES) {
      const source = path.join(STATIC_DIR, character, `${character}-${state}.webp`);
      const copy512 = path.join(dir, "512", `${character}-${state}.webp`);
      const copy256 = path.join(dir, "256", `${character}-${state}.webp`);
      const sourceSize = webpSize(source);
      const size256 = webpSize(copy256);

      assert.deepEqual(readFileSync(copy512), readFileSync(source), `${character}-${state}: 512-kopie is niet byte-identiek aan productie`);
      assert.equal(Math.max(size256.width, size256.height), 256, `${character}-${state}: 256-export heeft niet de bedoelde langste zijde`);
      assert.equal(size256.width * sourceSize.height, size256.height * sourceSize.width, `${character}-${state}: 256-export veranderde de verhouding`);
    }
  }
});
