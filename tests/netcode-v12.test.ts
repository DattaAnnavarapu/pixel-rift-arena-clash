import { test } from "node:test";
import assert from "node:assert/strict";
import { faultProfile, FaultLink } from "../server/network.js";
import { SnapshotBuffer, bestRegion } from "../src/netcode.js";
import { player, start, tick, snapshot, type Room } from "../server/game.js";
test("fault injection is bounded and always disabled in production", () => {
  assert.deepEqual(
    faultProfile({
      NODE_ENV: "production",
      SIM_LATENCY_MS: "999",
      SIM_LOSS: "1",
    }),
    { latency: 0, jitter: 0, loss: 0 },
  );
  assert.equal(faultProfile({ SIM_LATENCY_MS: "-20", SIM_LOSS: "9" }).loss, 1);
  const f = new FaultLink({ latency: 0, jitter: 0, loss: 1 }, () => 0);
  let calls = 0;
  f.send(() => calls++, true);
  assert.equal(calls, 0);
  f.send(() => calls++);
  assert.equal(calls, 1);
  f.close();
});
test("adaptive buffer bounds delay and optional region selection ignores unavailable regions", async () => {
  const b = new SnapshotBuffer();
  assert.ok(b.delay >= 100 && b.delay <= 250);
  assert.equal(
    (
      await bestRegion(
        [
          { id: "a", url: "a" },
          { id: "b", url: "b" },
        ],
        async (u) => (u.startsWith("b") ? 30 : 150),
      )
    )?.id,
    "b",
  );
});
test("optional shot IDs dedupe held commands; catch-up obeys cap and cover", () => {
  const r: Room = {
    code: "N",
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
  };
  start(r, 0);
  r.pickups = [];
  const p = r.players[0];
  p.x = 400;
  p.y = 300;
  p.rtt = 2000;
  p.input = { ...p.input, fire: true, shotId: 1 };
  tick(r, 2000, 1 / 30);
  assert.ok(r.bolts[0].x > 470 && r.bolts[0].x < 500);
  const ammo = p.ammo;
  tick(r, 2500, 1 / 30);
  assert.equal(p.ammo, ammo);
  p.input.shotId = 2;
  tick(r, 3000, 1 / 30);
  assert.equal(p.ammo, ammo - 1);
  const b = new SnapshotBuffer();
  const a = snapshot(r, 1000);
  b.push(a, 1000);
  b.push({ ...a, now: 1100 }, 1200);
  assert.ok(b.delay <= 250);
});

test("cosmetic bolts advance beyond 100ms, respect cover and never mutate source", async () => {
  const { cosmeticBoltPosition } = await import("../src/prediction.js");
  const b = { x: 280, y: 160, vx: 640, vy: 0, life: 1 };
  const copy = { ...b };
  const p = cosmeticBoltPosition(b, 0.4, "frost");
  assert.ok(p.x < 300);
  assert.deepEqual(b, copy);
  assert.ok(
    cosmeticBoltPosition({ ...b, x: 400, y: 300 }, 0.4, "astral").x > 600,
  );
});
test("redundant packets contain only bounded plain previous inputs", async () => {
  const { identify, inputPacket } = await import("../src/runtime.js");
  identify("history-test");
  inputPacket(1, 1000);
  inputPacket(2, 1016);
  const p = inputPacket(3, 1032);
  assert.deepEqual(
    p.history.map((p) => p.sequence),
    [1, 2],
  );
  assert.ok(p.history.every((p) => p.history === undefined));
  identify("");
});
