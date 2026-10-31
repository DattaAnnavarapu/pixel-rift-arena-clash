import { test } from "node:test";
import assert from "node:assert/strict";
import { botLevels, isBotLevel, type BotLevel } from "../server/bot-config.js";
import { findPath } from "../server/pathfinding.js";
import { blocked, player, start, tick, type Room } from "../server/game.js";
test("bot level whitelist excludes internal training; A* routes around shared cover", () => {
  for (const l of ["easy", "normal", "hard"]) assert.ok(isBotLevel(l));
  for (const l of ["training", "__proto__", null, 1])
    assert.equal(isBotLevel(l), false);
  const path = findPath({ x: 180, y: 160 }, { x: 450, y: 160 }, "frost");
  assert.ok(path.length > 0);
  assert.ok(path.every((p) => !blocked(p.x, p.y, 13, "frost")));
  assert.ok(path.some((p) => p.y > 250 || p.y < 70));
  assert.ok(botLevels.hard.reactionMs < botLevels.normal.reactionMs);
});
function duel(a: BotLevel, b: BotLevel, seed: number) {
  const p = player("a", "A", 0),
    q = player("b", "B", 1);
  p.bot = q.bot = true;
  p.botLevel = a;
  q.botLevel = b;
  const r: Room = {
    code: `D${seed}`,
    host: p.id,
    players: [p, q],
    phase: "lobby",
    scores: [0, 0],
    end: 0,
    winner: "",
    bolts: [],
    crystals: [],
    nextCrystal: 0,
    updated: 0,
    mode: "knockout",
    arena: "astral",
    botSeed: seed,
  };
  start(r, 0);
  r.pickups = [];
  for (let now = 33; now <= 181000 && r.phase !== "finished"; now += 33)
    tick(r, now, 0.033);
  return Math.sign(r.scores[0] - r.scores[1]);
}
test("seeded bot-v-bot performance ranks hard above normal above easy", () => {
  const report = [];
  for (const [a, b] of [
    ["hard", "normal"],
    ["normal", "easy"],
    ["hard", "easy"],
  ] as [BotLevel, BotLevel][]) {
    let wins = 0,
      losses = 0,
      draws = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const sign = duel(a, b, seed);
      if (sign > 0) wins++;
      else if (sign < 0) losses++;
      else draws++;
    }
    report.push({ a, b, wins, losses, draws });
    assert.ok(wins > losses, JSON.stringify(report));
  }
  console.log("Seeded duels", JSON.stringify(report));
});
