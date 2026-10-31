import { test } from "node:test";
import assert from "node:assert/strict";
import {
  player,
  tick,
  snapshot,
  type Room,
  type Effect,
} from "../server/game.js";
import {
  setupTutorial,
  skipTutorialStep,
  updateTutorial,
} from "../server/tutorial.js";
import { findPublicRoom } from "../server/release.js";
import { emptyProgress, updateProgress } from "../src/progress.js";
import { tutorialView } from "../src/tutorial-director.js";
function training() {
  const r: Room = {
    code: "TRAIN",
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
  setupTutorial(r, 1000);
  return r;
}
function event(r: Room, kind: Effect["kind"], extra: Partial<Effect> = {}) {
  r.eventId = (r.eventId ?? 0) + 1;
  r.effects ??= [];
  r.effects.push({
    id: r.eventId,
    kind,
    x: 200,
    y: 300,
    team: 0,
    at: 2000,
    actor: "a",
    ...extra,
  });
}
test("tutorial rooms have no timer/forfeit/match stats and cannot enter Quick Play", () => {
  const r = training();
  r.publicMatch = true;
  assert.equal(findPublicRoom([r], "crystal"), undefined);
  r.players[0].online = false;
  tick(r, 99999999, 0.033);
  assert.equal(r.phase, "playing");
  r.players[0].online = true;
  r.players[0].kills = 20;
  r.phase = "finished";
  r.winner = "Crimson";
  const old = emptyProgress();
  assert.equal(updateProgress(old, snapshot(r, 10000), "a"), old);
});
test("tutorial director advances only on real actor/target events and handles every step", () => {
  const r = training(),
    p = r.players[0];
  skipTutorialStep(r, 2000);
  p.x = 350;
  p.y = 300;
  updateTutorial(r, 2100);
  assert.equal(r.tutorialState!.step, 2);
  for (let i = 0; i < 3; i++)
    event(r, "hit", { actor: "b", target: r.players[1].id });
  updateTutorial(r, 2200);
  assert.equal(r.tutorialState!.step, 2);
  for (let i = 0; i < 3; i++) event(r, "hit", { target: r.players[1].id });
  updateTutorial(r, 2300);
  assert.equal(r.tutorialState!.step, 3);
  for (const kind of ["reload", "dash", "reflect", "nova"] as const) {
    event(r, kind);
    updateTutorial(r, 2400);
  }
  assert.equal(r.tutorialState!.step, 7);
  for (const pickupKind of ["health", "shield", "speed", "damage"] as const)
    event(r, "pickup", { pickupKind });
  updateTutorial(r, 2500);
  assert.equal(r.tutorialState!.step, 8);
  event(r, "crystal");
  updateTutorial(r, 2600);
  assert.equal(r.tutorialState!.step, 9);
  assert.equal(r.players[1].botLevel, "easy");
  p.kills++;
  p.deaths++;
  updateTutorial(r, 2700);
  assert.equal(r.tutorialState!.step, 10);
  assert.equal(tutorialView(snapshot(r, 2700), 2700, true)?.complete, true);
  setupTutorial(r, 3000);
  assert.equal(r.tutorialState!.step, 0);
});
test("touch wording and 15s stuck hints come from snapshot context", () => {
  const r = training();
  r.tutorialState!.step = 4;
  const view = tutorialView(snapshot(r, 1000), 18000, true)!;
  assert.ok(view.hint.includes("Tap"));
  assert.equal(view.stuck, true);
  assert.equal(view.total, 11);
  r.tutorial = false;
  assert.equal(tutorialView(snapshot(r, 1000), 1000, false), undefined);
});
test("server tutorial creation is private and code joining is rejected", async () => {
  const { createGameServer } = await import("../server/index.js");
  const { io } = await import("socket.io-client");
  const { PROTOCOL_VERSION } = await import("../server/release.js");
  const server = await createGameServer({ port: 0, serveClient: false });
  const clients: any[] = [];
  async function connect() {
    const s = io(server.url, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });
    clients.push(s);
    await new Promise<void>((res, rej) => {
      s.once("connect", res);
      s.once("connect_error", rej);
    });
    return s;
  }
  const enter = (s: any, a: any) =>
    new Promise<any>((res, rej) =>
      s
        .timeout(3000)
        .emit(
          "enter",
          { protocol: PROTOCOL_VERSION, ...a },
          (e: any, r: any) => (e ? rej(e) : res(r)),
        ),
    );
  try {
    const a = await connect(),
      r = await enter(a, { create: true, tutorial: true });
    assert.ok(!r.error);
    assert.ok(server.rooms.get(r.code)?.tutorial);
    const b = await connect();
    assert.match((await enter(b, { code: r.code })).error, /tutorial/i);
    const q = await enter(b, { matchmake: true });
    assert.notEqual(q.code, r.code);
    assert.equal(server.rooms.get(q.code)?.tutorial, false);
  } finally {
    clients.forEach((s) => s.disconnect());
    await server.close();
  }
});
