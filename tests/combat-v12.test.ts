import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classes,
  weapons,
  maxHealth,
  moveSpeed,
  type ClassId,
  type WeaponId,
} from "../server/combat.js";
import {
  arenas,
  player,
  start,
  tick,
  snapshot,
  movementVelocity,
  type Room,
} from "../server/game.js";
import { advancePosition, replayPosition } from "../src/prediction.js";
import { createGameServer } from "../server/index.js";
import { PROTOCOL_VERSION } from "../server/release.js";
import { io, type Socket } from "socket.io-client";
function room(classId: ClassId = "assault", weaponId: WeaponId = "blaster") {
  const r: Room = {
    code: "V12",
    host: "a",
    players: [player("a", "A", 0), player("b", "B", 1)],
    phase: "lobby",
    scores: [0, 0],
    end: 0,
    winner: "",
    bolts: [],
    crystals: [],
    nextCrystal: 0,
    updated: 0,
    arena: "astral",
    mode: "knockout",
  };
  r.players[0].classId = classId;
  r.players[0].weaponId = weaponId;
  start(r, 0);
  r.pickups = [];
  r.players[0].x = 400;
  r.players[0].y = 300;
  r.players[1].x = 850;
  r.players[1].y = 500;
  return r;
}
const expectedDamage = {
  assault: { blaster: 20, shotgun: 8, rifle: 50, repeater: 12, scatter: 12 },
  tank: { blaster: 17, shotgun: 7, rifle: 43, repeater: 10, scatter: 10 },
  scout: { blaster: 18, shotgun: 7, rifle: 45, repeater: 11, scatter: 11 },
  medic: { blaster: 18, shotgun: 7, rifle: 45, repeater: 11, scatter: 11 },
  ranger: { blaster: 20, shotgun: 8, rifle: 50, repeater: 12, scatter: 12 },
};
for (const classId of Object.keys(classes) as ClassId[]) {
  for (const weaponId of Object.keys(weapons) as WeaponId[]) {
    test(`${classId}/${weaponId}: class stats, projectile pattern, damage and cooldown`, () => {
      const r = room(classId, weaponId),
        p = r.players[0],
        w = weapons[weaponId];
      assert.equal(p.hp, classes[classId].hp);
      assert.equal(p.ammo, w.magazine);
      p.input.fire = true;
      tick(r, 2000, 1 / 30);
      assert.equal(r.bolts.length, w.spread.length);
      assert.ok(
        r.bolts.every((b) => b.damage === expectedDamage[classId][weaponId]),
      );
      assert.ok(
        r.bolts.every((b) => Math.abs(Math.hypot(b.vx, b.vy) - w.speed) < 1e-8),
      );
      assert.deepEqual(
        r.bolts.map((b) => Math.round(Math.atan2(b.vy, b.vx) * 100)),
        w.spread.map((x) => Math.round(x * 100)),
      );
      assert.equal(p.ammo, w.magazine - 1);
      assert.equal(p.shot, 2000 + w.interval);
      r.bolts = [];
      tick(r, 2001, 1 / 30);
      assert.equal(r.bolts.length, 0);
    });
  }
  test(`${classId}: movement and boosted prediction agree with server; healing and resets use class HP`, () => {
    const r = room(classId),
      p = r.players[0];
    p.input.x = 1;
    const view = snapshot(r, 2000).players[0],
      pos = { x: p.x, y: p.y };
    advancePosition(pos, view, p.input, 2000, 1 / 30, "astral");
    tick(r, 2000, 1 / 30);
    assert.ok(Math.abs(pos.x - p.x) < 1e-8);
    assert.ok(Math.abs(moveSpeed(p, 2000) - classes[classId].speed) < 1e-8);
    p.speedUntil = 8000;
    const boosted = movementVelocity(p, p.input, 2100, 1 / 30, "astral");
    assert.ok(Math.abs(boosted.x - classes[classId].speed * 1.4) < 1e-8);
    p.input.x = 0;
    p.hp = maxHealth(p) - 5;
    p.loadout = "mend";
    p.input.special = true;
    tick(r, 2200, 1 / 30);
    assert.equal(p.hp, maxHealth(p));
    p.special = 0;
    tick(r, 2300, 1 / 30);
    assert.equal(p.special, 0);
    p.input.special = false;
    p.hp -= 15;
    r.pickups = [{ kind: "health", x: p.x, y: p.y, availableAt: 0 }];
    tick(r, 2400, 1 / 30);
    assert.equal(p.hp, maxHealth(p));
    assert.equal(r.pickups[0].availableAt, 17400);
    p.hp = 0;
    p.respawn = 2500;
    p.ammo = 0;
    p.reloadAt = 99999;
    p.absorption = 35;
    p.absorptionUntil = 99999;
    tick(r, 2501, 1 / 30);
    assert.equal(p.hp, maxHealth(p));
    assert.equal(p.ammo, weapons.blaster.magazine);
    assert.equal(p.reloadAt, 0);
    assert.equal(p.absorption, 0);
    p.absorption = 35;
    p.damageUntil = 99999;
    start(r, 3000);
    assert.equal(p.hp, maxHealth(p));
    assert.equal(p.damageUntil, 0);
    assert.equal(p.absorption, 0);
    assert.equal(p.classId, classId);
  });
}
for (const weaponId of Object.keys(weapons) as WeaponId[]) {
  test(`${weaponId}: magazine exhaustion, auto reload and held-fire resume`, () => {
    const r = room("assault", weaponId),
      p = r.players[0],
      w = weapons[weaponId];
    p.input.fire = true;
    let last = 2000;
    for (let i = 0; i < w.magazine; i++) {
      last = 2000 + i * w.interval;
      r.bolts = [];
      tick(r, last, 1 / 30);
      assert.equal(r.bolts.length, w.spread.length);
      assert.equal(p.ammo, w.magazine - i - 1);
    }
    assert.equal(p.reloadAt, last + w.reload);
    r.bolts = [];
    tick(r, p.reloadAt - 1, 1 / 30);
    assert.equal(r.bolts.length, 0);
    assert.equal(p.ammo, 0);
    tick(r, p.reloadAt, 1 / 30);
    assert.equal(r.bolts.length, w.spread.length);
    assert.equal(p.ammo, w.magazine - 1);
    assert.equal(p.reloadAt, 0);
  });
}
test("specials remain usable during reload and class/damage buffs round only once", () => {
  const r = room("tank", "rifle"),
    p = r.players[0];
  p.damageUntil = 10000;
  p.input.fire = true;
  tick(r, 2000, 1 / 30);
  assert.equal(r.bolts[0].damage, 85);
  p.ammo = 0;
  p.reloadAt = 5000;
  p.loadout = "nova";
  p.input.special = true;
  r.bolts = [];
  tick(r, 2100, 1 / 30);
  assert.equal(r.bolts.length, 3);
  assert.ok(r.bolts.every((b) => b.damage === 26));
  assert.equal(p.ammo, 0);
  assert.equal(p.reloadAt, 5000);
});
function incoming(r: Room, damage: number) {
  const p = r.players[0];
  r.bolts.push({
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    life: 1,
    team: 1,
    owner: "b",
    damage,
  });
}
test("shield pickup absorbs, overflows to HP, expires and refreshes without stacking", () => {
  const r = room("tank"),
    p = r.players[0];
  r.pickups = [{ kind: "shield", x: p.x, y: p.y, availableAt: 0 }];
  tick(r, 2000, 1 / 30);
  assert.equal(p.absorption, 35);
  assert.equal(p.absorptionUntil, 7000);
  assert.equal(r.pickups[0].availableAt, 17000);
  r.pickups[0].availableAt = 0;
  tick(r, 2100, 1 / 30);
  assert.equal(
    r.pickups[0].availableAt,
    0,
    "full active shield does not waste pickup",
  );
  incoming(r, 20);
  tick(r, 2200, 1 / 30);
  assert.equal(p.hp, 140);
  assert.equal(p.absorption, 15);
  // Move pickup away before the next damage so it does not refresh the shield.
  r.pickups[0].x = 100;
  incoming(r, 30);
  tick(r, 2300, 1 / 30);
  assert.equal(p.hp, 125);
  assert.equal(p.absorption, 0);
  r.pickups[0].x = p.x;
  tick(r, 2400, 1 / 30);
  assert.equal(p.absorption, 35);
  assert.equal(p.absorptionUntil, 7400);
  incoming(r, 10);
  tick(r, 7400, 1 / 30);
  assert.equal(p.hp, 115);
  assert.equal(p.absorption, 0);
});
test("active E shield reflects rifle bolts before absorption and retains damage", () => {
  const r = room(),
    p = r.players[0];
  p.guard = 5000;
  p.absorption = 35;
  p.absorptionUntil = 5000;
  r.bolts = [
    {
      x: p.x - 15,
      y: p.y,
      vx: 640,
      vy: 0,
      life: 1,
      owner: "b",
      team: 1,
      damage: 50,
      weaponId: "rifle",
    },
  ];
  tick(r, 2000, 1 / 30);
  assert.equal(p.hp, 100);
  assert.equal(p.absorption, 35);
  assert.equal(r.bolts[0].owner, p.id);
  assert.equal(r.bolts[0].vx, -640);
  assert.equal(r.bolts[0].damage, 50);
});
test("fast rifle bolts cannot tunnel through cover on a long tick; center shield spawns are safe", () => {
  const r = room();
  r.arena = "frost";
  r.bolts = [
    {
      x: 280,
      y: 160,
      vx: 640,
      vy: 0,
      life: 1,
      team: 0,
      owner: "a",
      damage: 50,
    },
  ];
  tick(r, 2000, 0.2);
  assert.equal(r.bolts.length, 0);
  for (const a of Object.values(arenas)) {
    assert.ok(
      a.pickups?.some((p) => p.kind === "shield" && p.x === 480 && p.y === 300),
    );
  }
});
test("class-aware pending-input replay preserves walls and never predicts ammo or damage", () => {
  const r = room("scout", "shotgun"),
    p = snapshot(r, 2000).players[0];
  const input = { ...r.players[0].input, x: 1, fire: true, special: true };
  p.lastSequence = 0;
  const predicted = replayPosition(
    p,
    [{ sequence: 1, at: 900, input }],
    1000,
    2000,
    "astral",
  );
  assert.ok(Math.abs(predicted.x - (p.x + 21)) < 0.001);
  assert.equal(p.ammo, 4);
  assert.equal(p.hp, 80);
  assert.equal(p.special, 0);
});
test("real clients validate own lobby choices, preserve public readiness, reject in-match stat edits", async () => {
  const server = await createGameServer({ port: 0, serveClient: false });
  const clients: Socket[] = [];
  const wait = () => new Promise((resolve) => setTimeout(resolve, 35));
  async function connect(data: any) {
    const c = io(server.url, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });
    clients.push(c);
    await new Promise<void>((resolve, reject) => {
      c.once("connect", resolve);
      c.once("connect_error", reject);
    });
    const joined = await new Promise<any>((resolve, reject) =>
      c
        .timeout(3000)
        .emit(
          "enter",
          { protocol: PROTOCOL_VERSION, ...data },
          (err: any, result: any) => (err ? reject(err) : resolve(result)),
        ),
    );
    return { c, joined, r: server.rooms.get(joined.code)! };
  }
  try {
    const a = await connect({ create: true }),
      b = await connect({ code: a.joined.code });
    a.c.emit("lobby", { ready: true });
    b.c.emit("lobby", { ready: true });
    await wait();
    b.c.emit("lobby", {
      id: a.joined.id,
      classId: "tank",
      weaponId: "rifle",
      hp: 999,
      ammo: 999,
    });
    await wait();
    const pa = a.r.players.find((p) => p.id === a.joined.id)!,
      pb = a.r.players.find((p) => p.id === b.joined.id)!;
    assert.equal(pa.classId, "assault");
    assert.equal(pa.ready, true);
    assert.equal(pb.classId, "tank");
    assert.equal(pb.weaponId, "rifle");
    assert.equal(pb.hp, 140);
    assert.equal(pb.ammo, 4);
    assert.equal(pb.ready, false);
    for (const id of ["__proto__", "constructor", "TANK", 4, null, {}]) {
      b.c.emit("lobby", { classId: id, weaponId: id });
    }
    await wait();
    assert.equal(pb.classId, "tank");
    assert.equal(pb.weaponId, "rifle");
    start(a.r, Date.now());
    b.c.emit("lobby", { classId: "scout", weaponId: "shotgun" });
    b.c.emit("input", {
      x: 0,
      y: 0,
      angle: 0,
      classId: "scout",
      weaponId: "shotgun",
      ammo: 999,
      hp: 999,
      absorption: 999,
    });
    await wait();
    assert.equal(pb.classId, "tank");
    assert.equal(pb.weaponId, "rifle");
    assert.equal(pb.ammo, 4);
    assert.equal(pb.hp, 140);
    assert.equal(pb.absorption, 0);
    const c = await connect({ matchmake: true }),
      d = await connect({ matchmake: true });
    const countdown = c.r.startsAt;
    c.c.emit("lobby", { classId: "scout", weaponId: "shotgun" });
    await wait();
    assert.equal(c.joined.code, d.joined.code);
    assert.equal(c.r.players[0].ready, true);
    assert.equal(c.r.startsAt, countdown);
    const view = snapshot(c.r, Date.now()).players[0];
    assert.equal(view.classId, "scout");
    assert.equal(view.weaponId, "shotgun");
    assert.equal("input" in view, false);
  } finally {
    clients.forEach((c) => c.disconnect());
    await server.close();
  }
});
