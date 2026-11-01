import { test } from "node:test";
import assert from "node:assert/strict";
import { classes, weapons, weaponCadenceMs } from "../server/combat.js";
import { parseSettings } from "../src/settings.js";
import { joystickVector } from "../src/joystick.js";

test("weapon cadence switches retain the event baseline", () => {
  assert.deepEqual(weaponCadenceMs, { blaster: 800, shotgun: 1500, rifle: 1500 });
  for (const key of Object.keys(weaponCadenceMs) as Array<keyof typeof weaponCadenceMs>)
    assert.equal(weapons[key].interval, weaponCadenceMs[key]);
  for (const kind of Object.keys(classes) as Array<keyof typeof classes>)
    for (const weapon of Object.keys(weapons) as Array<keyof typeof weapons>) {
      const kit = weapons[weapon];
      const damage = Math.round(kit.damage * classes[kind].damage);
      assert.ok(damage > 0);
      assert.ok(kit.interval > 0);
    }
});
test("mobile stick size and sensitivity are clamped for safe input", () => {
  const s = parseSettings(JSON.stringify({ stickSize: 999, aimSensitivity: 100, leftHanded: true }));
  assert.equal(s.stickSize, 132);
  assert.equal(s.aimSensitivity, 2);
  assert.equal(s.leftHanded, true);
  assert.deepEqual(joystickVector(0, 0, 40), { x: 0, y: 0, active: false });
});
