import { test } from "node:test";
import assert from "node:assert/strict";
import {
  player,
  start,
  tick,
  snapshot,
  removeExpiredPlayer,
  type Room,
} from "../server/game.js";
export function room(): Room {
  return {
    code: "ABC123",
    host: "a",
    players: [player("a", "Alpha", 0), player("b", "Beta", 1)],
    phase: "lobby",
    scores: [0, 0],
    end: 0,
    winner: "",
    bolts: [],
    crystals: [],
    nextCrystal: 0,
    updated: 0,
  };
}
test("forfeit waits 15 seconds, resets on reconnect, and overrides score", () => {
  const r = room();
  start(r, 0);
  r.scores = [19, 0];
  r.players[0].online = false;
  tick(r, 100, 0.01);
  tick(r, 15099, 0.01);
  assert.equal(r.phase, "playing");
  r.players[0].online = true;
  tick(r, 15100, 0.01);
  r.players[0].online = false;
  tick(r, 15200, 0.01);
  tick(r, 30200, 0.01);
  assert.equal(r.winner, "Azure");
  assert.equal(r.finishReason, "forfeit");
});
test("stationary dash follows aim for the entire burst", () => {
  const r = room();
  start(r, 0);
  const p = r.players[0];
  p.input.angle = Math.PI / 2;
  p.input.dash = true;
  const y = p.y;
  tick(r, 2000, 0.03);
  tick(r, 2030, 0.03);
  assert.ok(p.y > y + 35);
  assert.equal(p.x, 90);
});
test("expired session cleanup preserves reconnects and other rooms", () => {
  const r = room(),
    p = r.players[0],
    sessions = new Map([
      ["token", { code: r.code, id: p.id }],
      ["other", { code: "OTHER", id: p.id }],
    ]);
  p.lastInput = 10;
  assert.equal(removeExpiredPlayer(r, p.id, 10, sessions), false);
  p.online = false;
  assert.equal(removeExpiredPlayer(r, p.id, 9, sessions), false);
  assert.equal(removeExpiredPlayer(r, p.id, 10, sessions), true);
  assert.equal(sessions.has("token"), false);
  assert.equal(sessions.has("other"), true);
});
test("snapshot omits input and stale effects but retains animation fields", () => {
  const r = room();
  r.effects = [{ id: 1, kind: "hit", x: 0, y: 0, team: 0, at: 0 }];
  r.players[0].input.x = 1;
  const s = snapshot(r, 601);
  assert.equal("input" in s.players[0], false);
  assert.equal("lastInput" in s.players[0], false);
  assert.equal(s.players[0].moving, true);
  assert.equal(s.effects?.length, 0);
});

test("prediction respects walls and gently corrects drift; bolt extrapolation is capped", async () => {
  const { predictPosition, boltPosition } =
    await import("../src/prediction.js");
  const r = room();
  start(r, 0);
  const p = snapshot(r, 100).players[0];
  const pos = predictPosition(
    { x: 90, y: 245 },
    p,
    { x: 1, y: 0, angle: 0, fire: false, dash: false, shield: false },
    100,
    0.016,
    0,
    "astral",
  );
  assert.ok(pos.x > 90 && pos.x < 94);
  const bolt = boltPosition(
    { x: 100, y: 300, vx: 420, vy: 0, life: 1 },
    10,
    "astral",
  );
  assert.equal(bolt.x, 142);
  const near = boltPosition(
    { x: 220, y: 160, vx: 420, vy: 0, life: 1 },
    0.1,
    "astral",
  );
  assert.ok(near.x < 230);
});
test("KO feed records killer, victim and stats once", () => {
  const r = room();
  start(r, 0);
  const p = r.players[1];
  p.hp = 20;
  r.bolts = [{ x: p.x, y: p.y, vx: 0, vy: 0, life: 1, owner: "a", team: 0 }];
  tick(r, 2000, 0.01);
  assert.equal(r.feed?.[0].killer, "Alpha");
  assert.equal(r.feed?.[0].victim, "Beta");
  assert.equal(r.players[0].kills, 1);
});

test("shield reflects bolt ownership and velocity without damaging defender", () => {
  const r = room();
  start(r, 0);
  const p = r.players[1];
  p.guard = 5000;
  r.bolts = [{ x: p.x, y: p.y, vx: 420, vy: 0, life: 1, owner: "a", team: 0 }];
  tick(r, 2000, 0.01);
  assert.equal(p.hp, 100);
  assert.equal(r.bolts[0].owner, "b");
  assert.equal(r.bolts[0].team, 1);
  assert.equal(r.bolts[0].vx, -420);
});
test("bots are host-only, balanced, ready and simulate valid inputs", async () => {
  const { manageBots } = await import("../server/bots.js");
  const r = room();
  r.players.pop();
  assert.equal(manageBots(r, "no", true), false);
  assert.equal(manageBots(r, "a", true), true);
  assert.equal(r.players.length, 4);
  assert.equal(r.players.filter((p) => p.team === 1).length, 2);
  assert.ok(r.players.filter((p) => p.bot).every((p) => p.ready));
  start(r, 0);
  tick(r, 2000, 0.03);
  assert.ok(
    r.players.filter((p) => p.bot).every((p) => Number.isFinite(p.input.angle)),
  );
  assert.equal(manageBots(r, "a", false), false);
});
test("Blink stops before walls and honors cooldown", () => {
  const r = room();
  start(r, 0);
  const p = r.players[0];
  p.loadout = "blink";
  p.x = 200;
  p.y = 170;
  p.input.special = true;
  p.input.angle = 0;
  tick(r, 2000, 0.01);
  assert.ok(p.x < 217 && p.x > 200);
  assert.equal(p.special, 12000);
  const x = p.x;
  tick(r, 2010, 0.01);
  assert.equal(p.x, x);
});
test("overtime boundary shrinks in 5-second steps and damages outside", async () => {
  const { playableBounds } = await import("../server/game.js");
  const r = room();
  start(r, 0);
  tick(r, 180000, 0.01);
  assert.equal(playableBounds(r, 184999).x, 0);
  assert.equal(playableBounds(r, 185000).x, 60);
  r.players[0].x = 20;
  tick(r, 185001, 0.01);
  assert.equal(r.players[0].hp, 75);
});

test("all level walls and spawns are mirrored, clear center and safe spawns", async () => {
  const { arenas, blocked } = await import("../server/game.js");
  for (const [id, a] of Object.entries(arenas)) {
    const key = id as keyof typeof arenas;
    assert.equal(blocked(480, 300, 13, key), false);
    for (const p of a.spawns) {
      assert.equal(blocked(p.x, p.y, 20, key), false);
      assert.ok(a.spawns.some((q) => q.x === 960 - p.x && q.y === 600 - p.y));
    }
    for (const w of a.walls)
      assert.ok(
        a.walls.some(
          (q) =>
            q.x === 960 - w.x - w.w &&
            q.y === 600 - w.y - w.h &&
            q.w === w.w &&
            q.h === w.h,
        ),
      );
    for (const y of [245, 355]) {
      assert.equal(blocked(90, y, 13, key), false);
      assert.equal(blocked(870, y, 13, key), false);
    }
  }
});
test("lava ticks 5 damage per second; vents pulse", async () => {
  const { hazardActive } = await import("../server/game.js");
  const r = room();
  r.arena = "ember";
  start(r, 0);
  const p = r.players[0];
  p.x = 380;
  p.y = 190;
  tick(r, 2000, 0.01);
  assert.equal(p.hp, 95);
  tick(r, 2500, 0.01);
  assert.equal(p.hp, 95);
  tick(r, 3000, 0.01);
  assert.equal(p.hp, 90);
  assert.equal(
    hazardActive({ kind: "vent", x: 0, y: 0, w: 1, h: 1 }, 1000),
    true,
  );
  assert.equal(
    hazardActive({ kind: "vent", x: 0, y: 0, w: 1, h: 1 }, 2000),
    false,
  );
});
test("portals transport both ways with 2-second cooldown", () => {
  const r = room();
  start(r, 0);
  const p = r.players[0];
  p.x = 150;
  p.y = 300;
  tick(r, 2000, 0.01);
  assert.equal(p.x, 810);
  tick(r, 2100, 0.01);
  assert.equal(p.x, 810);
  tick(r, 4000, 0.01);
  assert.equal(p.x, 150);
});
test("bush redacts enemy position, retains ally transparency marker", () => {
  const r = room();
  r.arena = "grove";
  start(r, 0);
  r.players[1].x = 360;
  r.players[1].y = 200;
  const enemy = snapshot(r, 2000, "a").players[1],
    own = snapshot(r, 2000, "b").players[1];
  assert.equal(enemy.hidden, true);
  assert.equal(enemy.x, -1000);
  assert.equal(own.hidden, false);
  assert.equal(own.inBush, true);
});
test("cracked wall breaks at 3 bolt hits and resets on rematch", async () => {
  const { blocked } = await import("../server/game.js");
  const r = room();
  r.arena = "grove";
  start(r, 0);
  for (let i = 0; i < 3; i++) {
    r.bolts = [{ x: 220, y: 110, vx: 0, vy: 0, life: 1, owner: "a", team: 0 }];
    tick(r, 2000 + i, 0.01);
  }
  assert.ok(r.brokenWalls?.includes(0));
  assert.equal(blocked(220, 110, 4, "grove", r.brokenWalls), false);
  start(r, 4000);
  assert.equal(r.brokenWalls?.length, 0);
});
test("health, speed and damage pickups are authoritative and time limited", () => {
  const r = room();
  start(r, 0);
  const p = r.players[0];
  r.pickups = [{ kind: "health", x: 90, y: 245, availableAt: 0 }];
  p.hp = 50;
  tick(r, 2000, 0.01);
  assert.equal(p.hp, 85);
  assert.equal(r.pickups[0].availableAt, 17000);
  r.pickups = [
    { kind: "speed", x: p.x, y: p.y, availableAt: 0 },
    { kind: "damage", x: p.x, y: p.y, availableAt: 0 },
  ];
  tick(r, 2100, 0.01);
  assert.equal(p.speedUntil, 7100);
  p.input.fire = true;
  tick(r, 2200, 0.01);
  assert.equal(r.bolts[0].damage, 40);
  p.input.fire = false;
  tick(r, 7200, 0.01);
  p.input.fire = true;
  tick(r, 7300, 0.01);
  assert.equal(r.bolts.at(-1)?.damage, 20);
});
test("Frost ice has reduced friction when input is released", async () => {
  const { movementVelocity } = await import("../server/game.js");
  const p = { x: 480, y: 300, burst: 0, vx: 175, vy: 0 };
  const v = movementVelocity(p, { x: 0, y: 0 }, 2000, 0.03, "frost");
  assert.ok(v.x > 150 && v.x < 175);
  assert.equal(movementVelocity(p, { x: 0, y: 0 }, 2000, 0.03, "astral").x, 0);
});

test("saved progress deduplicates KOs and wins across reconnects, tracks favorite kit", async () => {
  const { emptyProgress, readProgress, updateProgress, favorite } =
    await import("../src/progress.js");
  const r = room();
  start(r, 100);
  r.players[0].loadout = "blink";
  r.players[0].kills = 2;
  let p = updateProgress(emptyProgress(), snapshot(r, 200), "a");
  assert.equal(p.kos, 2);
  assert.equal(favorite(p), "BLINK");
  p = updateProgress(p, snapshot(r, 300), "a");
  assert.equal(p.kos, 2);
  r.phase = "finished";
  r.winner = "Crimson";
  p = updateProgress(p, snapshot(r, 400), "a");
  assert.equal(p.wins, 1);
  assert.equal(updateProgress(p, snapshot(r, 500), "a").wins, 1);
  assert.equal(readProgress("bad").wins, 0);
  assert.equal(readProgress(JSON.stringify(p)).kos, 2);
});
