import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classes,
  weapons,
  outgoingDamage,
  type ClassId,
  type WeaponId,
} from "../server/combat.js";
import { player, start, tick, type Room } from "../server/game.js";
function ttk(c: ClassId, w: WeaponId, boost: boolean) {
  const p = { classId: c, damageUntil: boost ? 1e9 : 0 },
    weapon = weapons[w];
  let hp = 100,
    at = 0,
    ammo = weapon.magazine;
  while (hp > 0 && at < 20000) {
    for (const _ of weapon.spread) {
      let d = outgoingDamage(p, weapon.damage, 0);
      if (w === "rifle" && hp === 100 && d >= hp) d = hp - 1;
      hp -= d;
      if (hp <= 0) break;
    }
    if (hp > 0) {
      ammo--;
      if (ammo === 0) {
        at += Math.max(weapon.reload, weapon.interval);
        ammo = weapon.magazine;
      } else at += weapon.interval;
    }
  }
  return at / 1000;
}
test("all nine attackers stay in 1.5–4s reference TTK band with/without damage pickup", () => {
  const report = [];
  for (const c of Object.keys(classes) as ClassId[])
    for (const w of Object.keys(weapons) as WeaponId[])
      for (const boost of [false, true]) {
        const seconds = ttk(c, w, boost);
        report.push({ c, w, boost, seconds });
        assert.ok(
          seconds >= 1.5 && seconds <= 4,
          JSON.stringify(report.at(-1)),
        );
      }
  console.log("TTK reference:", JSON.stringify(report));
});
test("boosted rifle leaves full-health Assault/Scout at 1HP but can finish wounded targets", () => {
  for (const classId of ["assault", "scout"] as ClassId[]) {
    const a = player("a", "A", 0),
      b = player("b", "B", 1);
    b.classId = classId;
    const r: Room = {
      code: "T",
      host: a.id,
      players: [a, b],
      phase: "lobby",
      scores: [0, 0],
      end: 0,
      winner: "",
      bolts: [],
      crystals: [],
      nextCrystal: 0,
      updated: 0,
    };
    start(r, 0);
    r.pickups = [];
    a.x = 100;
    b.x = 400;
    b.y = 300;
    r.bolts = [
      {
        x: 400,
        y: 300,
        vx: 0,
        vy: 0,
        life: 1,
        owner: a.id,
        team: 0,
        damage: 100,
        weaponId: "rifle",
      },
    ];
    tick(r, 2000, 0.01);
    assert.equal(b.hp, 1);
    r.bolts = [
      {
        x: 400,
        y: 300,
        vx: 0,
        vy: 0,
        life: 1,
        owner: a.id,
        team: 0,
        damage: 50,
        weaponId: "rifle",
      },
    ];
    tick(r, 2100, 0.01);
    assert.equal(b.hp, 0);
    assert.equal(a.kills, 1);
  }
});
test("rifle range remains bounded after speed tuning", () => {
  assert.equal(weapons.rifle.speed, 720);
  assert.equal(weapons.rifle.speed * weapons.rifle.life, 704);
});
