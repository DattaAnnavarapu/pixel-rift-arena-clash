import { test } from "node:test";
import assert from "node:assert/strict";
import {
  player,
  start,
  tick,
  updateFlags,
  snapshot,
  playableBounds,
  type Room,
} from "../server/game.js";
import {
  emptyProgress,
  updateProgress,
  readProgress,
} from "../src/progress.js";
function room(): Room {
  return {
    code: "CTF123",
    host: "a",
    players: [player("a", "A", 0), player("b", "B", 1)],
    phase: "lobby",
    mode: "ctf",
    arena: "citadel",
    scores: [0, 0],
    end: 0,
    winner: "",
    bolts: [],
    crystals: [],
    nextCrystal: 0,
    updated: 0,
  };
}
test("flag steal, home capture, blocked capture, manual return and timed return", () => {
  const r = room();
  start(r, 0);
  const [a, b] = r.players;
  a.x = 870;
  a.y = 300;
  updateFlags(r, 2000);
  assert.equal(r.flags![1].carrier, a.id);
  a.x = 90;
  updateFlags(r, 2100);
  assert.deepEqual(r.scores, [1, 0]);
  assert.equal(a.captures, 1);
  a.x = 870;
  updateFlags(r, 2200);
  b.x = 90;
  b.y = 300;
  updateFlags(r, 2300);
  a.x = 90;
  updateFlags(r, 2400);
  assert.deepEqual(r.scores, [1, 0]);
  b.x = 300;
  b.online = false;
  updateFlags(r, 2500);
  assert.equal(r.flags![0].droppedAt, 2500);
  a.x = 300;
  updateFlags(r, 2600);
  assert.equal(a.returns, 1);
  assert.equal(r.flags![0].droppedAt, undefined);
  a.x = 90;
  updateFlags(r, 2700);
  assert.deepEqual(r.scores, [2, 0]);
  a.x = 870;
  updateFlags(r, 2800);
  a.x = 600;
  a.online = false;
  updateFlags(r, 2900);
  updateFlags(r, 14900);
  assert.equal(r.flags![1].x, 870);
  assert.equal(r.flags![1].carrier, undefined);
  start(r, 16000);
  assert.deepEqual(r.scores, [0, 0]);
  assert.equal(a.captures, 0);
  assert.ok(r.flags!.every((f) => !f.carrier));
});
test("CTF KOs do not score, capped damage tracked, carrier drops; overtime leaves bases accessible", () => {
  const r = room();
  start(r, 0);
  const [a, b] = r.players;
  a.x = 870;
  a.y = 300;
  updateFlags(r, 2000);
  a.hp = 10;
  r.bolts = [
    { x: a.x, y: a.y, vx: 0, vy: 0, owner: b.id, team: 1, life: 1, damage: 50 },
  ];
  tick(r, 2100, 0.01);
  assert.equal(b.damageDealt, 10);
  assert.equal(b.kills, 1);
  assert.deepEqual(r.scores, [0, 0]);
  assert.equal(r.flags![1].carrier, undefined);
  assert.equal(
    playableBounds({ mode: "ctf", phase: "overtime", overtimeStart: 0 }, 20000)
      .x,
    0,
  );
});
test("third flag capture ends match and ties draw after overtime", () => {
  const r = room();
  start(r, 0);
  const a = r.players[0];
  r.scores = [2, 0];
  a.x = 870;
  a.y = 300;
  updateFlags(r, 2000);
  a.x = 90;
  tick(r, 2100, 0.01);
  assert.equal(r.phase, "finished");
  assert.equal(r.winner, "Crimson");
  const tie = room();
  start(tie, 0);
  tick(tie, 240000, 0.01);
  assert.equal(tie.phase, "overtime");
  tick(tie, 270000, 0.01);
  assert.equal(tie.winner, "Draw");
});
test("Medic Mend heals nearby teammates, caps actual healing and leaves enemies untouched", () => {
  const r = room();
  const a = r.players[0],
    b = r.players[1],
    c = player("c", "C", 0);
  r.players.push(c);
  a.classId = "medic";
  a.loadout = "mend";
  start(r, 0);
  r.pickups=[];
  a.x = c.x = b.x = 150;
  a.y = c.y = b.y = 300;
  a.hp = 100;
  c.hp = 80;
  b.hp = 50;
  a.input.special = true;
  a.lastInput = 2000;
  tick(r, 2000, 0.01);
  assert.equal(a.hp, 110);
  assert.equal(c.hp, 100);
  assert.equal(b.hp, 50);
  assert.equal(a.healingDone, 30);
  assert.equal(a.special, 14000);
});
test("completed rounds award XP once; tutorial, spectators, forfeits do not", () => {
  const r = room();
  start(r, 0);
  r.phase = "finished";
  r.winner = "Crimson";
  const s = snapshot(r, 3000);
  const p = updateProgress(emptyProgress(), s, "a");
  assert.equal(p.xp, 150);
  assert.equal(p.matches, 1);
  assert.equal(updateProgress(p, s, "a").xp, 150);
  assert.equal(updateProgress(emptyProgress(), s, "watcher").xp, undefined);
  assert.equal(
    updateProgress(emptyProgress(), { ...s, tutorial: true }, "a").xp,
    undefined,
  );
  assert.equal(
    updateProgress(emptyProgress(), { ...s, finishReason: "forfeit" }, "a").xp,
    undefined,
  );
  assert.equal(readProgress(JSON.stringify({ ...p, xp: -100 })).xp, 0);
});
test("spectator snapshots redact concealed players from both teams", () => {
  const r = room();
  r.arena = "grove";
  r.spectators = [{ id: "watch", name: "Watcher" }];
  r.players[0].x = 360;
  r.players[0].y = 200;
  r.players[1].x = 360;
  r.players[1].y = 200;
  const s = snapshot(r, 0, "watch");
  assert.ok(s.players.every((p) => p.hidden && p.x === -1000));
});
