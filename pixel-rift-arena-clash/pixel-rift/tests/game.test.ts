import { test } from "node:test";
import assert from "node:assert/strict";
import { player, start, tick, blocked, type Room } from "../server/game.js";
function room(): Room {
  return {
    code: "ABC123",
    host: "a",
    players: [player("a", "One", 0), player("b", "Two", 1)],
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
test("movement normalized and walls block", () => {
  const r = room();
  start(r, 1000);
  const p = r.players[0];
  p.input.x = p.input.y = 1;
  const { x, y } = p;
  tick(r, 1100, 0.03);
  assert.ok(Math.hypot(p.x - x, p.y - y) <= 175 * 0.03 + 0.001);
  assert.ok(blocked(240, 150));
  assert.ok(blocked(-10, 200));
});
test("bolts damage enemies, award knockout points, respawn", () => {
  const r = room();
  start(r, 0);
  const [a, b] = r.players;
  a.x = 400;
  a.y = 300;
  b.x = 425;
  b.y = 300;
  b.hp = 20;
  r.bolts = [{ x: 415, y: 300, vx: 0, vy: 0, owner: a.id, team: 0, life: 1 }];
  tick(r, 2000, 0.03);
  assert.equal(r.scores[0], 3);
  assert.equal(b.respawn, 5000);
  tick(r, 5001, 0.03);
  assert.equal(b.hp, 100);
  assert.equal(b.respawn, 0);
});
test("shield blocks damage and friendly fire never damages", () => {
  const r = room();
  start(r, 0);
  const [a, b] = r.players;
  b.guard = 4000;
  r.bolts = [{ x: b.x, y: b.y, vx: 0, vy: 0, owner: a.id, team: 0, life: 1 }];
  tick(r, 2000, 0.03);
  assert.equal(b.hp, 100);
});
test("crystals score and target ends match", () => {
  const r = room();
  start(r, 0);
  r.scores = [19, 0];
  r.crystals = [{ x: r.players[0].x, y: r.players[0].y }];
  tick(r, 2000, 0.03);
  assert.equal(r.phase, "finished");
  assert.equal(r.winner, "Crimson");
});
test("tie enters sudden death, next score wins; overtime can draw", () => {
  const r = room();
  start(r, 0);
  tick(r, 180001, 0.03);
  assert.equal(r.phase, "overtime");
  r.crystals = [{ x: r.players[1].x, y: r.players[1].y }];
  tick(r, 180002, 0.03);
  assert.equal(r.winner, "Azure");
  const q = room();
  start(q, 0);
  tick(q, 180001, 0.03);
  tick(q, 210002, 0.03);
  assert.equal(q.winner, "Draw");
});
test("dash moves farther for 180ms and respects cooldown", () => {
  const r = room();
  start(r, 0);
  const p = r.players[0];
  p.input.x = 1;
  p.input.dash = true;
  const x = p.x;
  tick(r, 2000, 1 / 30);
  assert.ok(p.x - x > 15);
  assert.equal(p.dash, 7000);
  tick(r, 2033, 1 / 30);
  assert.equal(p.dash, 7000);
  tick(r, 2300, 1 / 30);
  assert.equal(p.dash, 7000);
});
test("teammates spawn apart and friendly bolts do not hurt", () => {
  const r = room();
  r.players.push(player("c", "Three", 0));
  start(r, 0);
  assert.notEqual(r.players[0].y, r.players[2].y);
  const p = r.players[2];
  r.bolts = [{ x: p.x, y: p.y, vx: 0, vy: 0, owner: "a", team: 0, life: 1 }];
  tick(r, 2000, 0.03);
  assert.equal(p.hp, 100);
});
test("rematch resets scores, abilities, health and readiness", () => {
  const r = room();
  start(r, 0);
  r.scores = [20, 8];
  r.players[0].hp = 20;
  r.players[0].ready = true;
  r.players[0].dash = 999999;
  start(r, 300000);
  assert.deepEqual(r.scores, [0, 0]);
  assert.equal(r.players[0].hp, 100);
  assert.equal(r.players[0].dash, 0);
  assert.equal(r.players[0].ready, false);
  assert.equal(r.end, 480000);
});
