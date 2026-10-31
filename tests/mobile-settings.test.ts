import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSettings } from "../src/settings.js";
import { readFileSync } from "node:fs";
test("optional mobile preferences are clamped and legacy settings retain their shape", () => {
  const p = parseSettings(
    JSON.stringify({
      stickSize: 999,
      aimSensitivity: -1,
      leftHanded: true,
      haptics: true,
      quality: "low",
      shadows: false,
    }),
  );
  assert.equal(p.stickSize, 132);
  assert.equal(p.aimSensitivity, 0.5);
  assert.equal(p.leftHanded, true);
  assert.equal(p.quality, "low");
  assert.deepEqual(parseSettings(null), {
    volume: 0.7,
    reducedMotion: false,
    particles: true,
  });
});
test("installable manifest and mobile metadata remain present", () => {
  const m = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
  assert.equal(m.display, "standalone");
  assert.ok(readFileSync("index.html", "utf8").includes('lang="en"'));
});
