import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MASCOT_STATES, registeredStaticMascots, staticMascotAsset, staticMascotPath } from "../src/lib/mascots";

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const STATIC_DIR = path.join(PUBLIC, "mascots", "static");

test("elk geregistreerd mascottebestand bestaat echt", () => {
  for (const { character, state, asset } of registeredStaticMascots()) {
    assert.equal(asset.src, staticMascotPath(character, state));
    assert.ok(existsSync(path.join(PUBLIC, asset.src)), `${asset.src} ontbreekt in public/`);
    assert.ok(asset.width > 0 && asset.height > 0, `${asset.src}: afmetingen ontbreken`);
  }
});

test("elk bestand in public/mascots/static volgt de naamconventie", () => {
  const states = new Set<string>(MASCOT_STATES);
  for (const character of readdirSync(STATIC_DIR)) {
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
