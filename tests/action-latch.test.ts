import { test } from "node:test";
import assert from "node:assert/strict";
import { ActionLatch } from "../src/action-latch.js";
test("combat buttons accept keyboard/AT clicks without duplicating pointer activation", () => {
  const a = new ActionLatch();
  a.down();
  assert.equal(a.click(1), false);
  assert.equal(a.click(0), true);
  assert.equal(a.click(1), true);
  a.down();
  a.cancel();
  assert.equal(a.click(0), true);
});
test("server retains a press/release transition until exactly one simulation consumes it", async () => {
  const { InputLatch } = await import("../server/input-latch.js");
  const latch = new InputLatch(),
    p = {};
  latch.capture(p, { fire: false, dash: true, shield: false, special: true });
  latch.capture(p, { fire: false, dash: false, shield: false, special: false });
  assert.equal(latch.consume(p)?.dash, true);
  assert.equal(latch.consume(p), undefined);
  latch.capture(p, { fire: true, dash: false, shield: false, special: false });
  assert.equal(latch.consume(p)?.fire, true);
});
test("short fire taps generate fresh correlated shot IDs even between render frames", async () => {
  const { player, start, snapshot } = await import("../server/game.js");
  const r: any = {
    code: "ID",
    host: "a",
    players: [player("a", "A", 0)],
    phase: "lobby",
    scores: [0, 0],
    end: 0,
    winner: "",
    bolts: [],
    crystals: [],
    nextCrystal: 0,
    updated: 0,
  };
  start(r, Date.now());
  const rt = await import("../src/runtime.js");
  rt.identify("a");
  rt.receive(snapshot(r, Date.now()));
  rt.queueAction("fire");
  const now = Date.now();
  const a = rt.inputPacket(1, now);
  assert.ok(Number.isSafeInteger(a.shotId));
  rt.queueAction("fire");
  const b = rt.inputPacket(2, now + 900);
  assert.ok(b.shotId! > a.shotId!);
  assert.equal(rt.shotRequests.length, 2);
  rt.identify("");
  rt.receive(null);
  rt.resetInput();
});
