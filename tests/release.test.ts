import { test } from "node:test";
import assert from "node:assert/strict";
import {
  player,
  start,
  tick,
  snapshot,
  configure,
  loadouts,
  type Room,
} from "../server/game.js";
import {
  findPublicRoom,
  updateMatchmaking,
  removePlayer,
  validSequence,
  PROTOCOL_VERSION,
} from "../server/release.js";
import { parseSettings } from "../src/settings.js";
import { createGameServer } from "../server/index.js";
import { io, type Socket } from "socket.io-client";
function room(code = "RIFT01"): Room {
  return {
    code,
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
    mode: "crystal",
  };
}
test("Pulse damages and pushes enemies, respects shields, allies, walls and cooldown", () => {
  const r = room();
  start(r, 0);
  const [a, b] = r.players;
  a.loadout = "pulse";
  a.x = 360;
  a.y = 300;
  b.x = 380;
  b.y = 300;
  a.input.special = true;
  tick(r, 2000, 0.01);
  assert.equal(b.hp, 80);
  assert.ok(b.x > 440);
  assert.equal(a.special, 11000);
  const hp = b.hp;
  tick(r, 2010, 0.01);
  assert.equal(b.hp, hp);
  start(r, 3000);
  a.x = 190;
  a.y = 170;
  b.x = 210;
  b.y = 170;
  a.input.special = true;
  tick(r, 5000, 0.01);
  assert.ok(b.x < 217);
  start(r, 6000);
  a.x = 400;
  a.y = 300;
  b.x = 450;
  b.y = 300;
  b.guard = 10000;
  a.input.special = true;
  tick(r, 8000, 0.01);
  assert.equal(b.hp, 100);
  assert.equal(b.x, 450);
  assert.equal(loadouts.pulse.cooldown, 9000);
});
test("Blitz ends after 90s and crystals score two while collection counts one", () => {
  const r = room();
  r.mode = "blitz";
  start(r, 1000);
  assert.equal(r.end, 91000);
  r.crystals = [{ x: r.players[0].x, y: r.players[0].y }];
  tick(r, 2000, 0.01);
  assert.deepEqual(r.scores, [2, 0]);
  assert.equal(r.players[0].collected, 1);
  tick(r, 91000, 0.01);
  assert.equal(r.winner, "Crimson");
});
test("matchmaking selects only eligible public lobbies by mode and capacity", () => {
  const privateRoom = room("PRIVATE"),
    full = room("FULL"),
    publicRoom = room("PUBLIC");
  full.publicMatch = publicRoom.publicMatch = true;
  full.players.push(player("c", "C", 0), player("d", "D", 1));
  assert.equal(
    findPublicRoom([privateRoom, full, publicRoom], "crystal")?.code,
    "PUBLIC",
  );
  assert.equal(findPublicRoom([publicRoom], "blitz"), undefined);
  publicRoom.phase = "playing";
  assert.equal(findPublicRoom([publicRoom], "crystal"), undefined);
});
test("quick play countdown needs two humans on opposing teams, all ready; cancel is immediate", () => {
  const r = room();
  r.publicMatch = true;
  r.players.forEach((p) => (p.ready = true));
  updateMatchmaking(r, 1000);
  assert.equal(r.startsAt, 6000);
  r.players[1].ready = false;
  updateMatchmaking(r, 2000);
  assert.equal(r.startsAt, undefined);
  r.players[1].ready = true;
  updateMatchmaking(r, 3000);
  updateMatchmaking(r, 8000);
  assert.equal(r.phase, "playing");
  assert.equal(r.startsAt, undefined);
});
test("leave removes player/token, migrates host and cancels countdown", () => {
  const r = room();
  r.startsAt = 1000;
  const sessions = new Map([["token", { code: r.code, id: "a" }]]);
  removePlayer(r, "a", sessions);
  assert.equal(r.host, "b");
  assert.equal(sessions.size, 0);
  assert.equal(r.players.length, 1);
  assert.equal(r.startsAt, undefined);
});
test("network sequence and settings validation reject invalid values", () => {
  assert.equal(validSequence(5, 4), true);
  for (const v of [4, 3, -1, NaN, Infinity, 1.5, "5"])
    assert.equal(validSequence(v, 4), false);
  assert.deepEqual(
    parseSettings('{"volume":99,"particles":false,"reducedMotion":true}'),
    { volume: 1, particles: false, reducedMotion: true },
  );
  assert.equal(parseSettings("bad").volume, 0.7);
});
test("real quick-play clients match privately, reject old protocol and stale inputs, and leave cleanly", async () => {
  const server = await createGameServer({ port: 0, serveClient: false });
  const clients: Socket[] = [];
  async function client() {
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
  function enter(s: Socket, data: any) {
    return new Promise<any>((res, rej) =>
      s
        .timeout(3000)
        .emit(
          "enter",
          { protocol: PROTOCOL_VERSION, ...data },
          (err: any, r: any) => (err ? rej(err) : res(r)),
        ),
    );
  }
  try {
    const [a, b, c] = await Promise.all([client(), client(), client()]);
    assert.match(
      (await enter(c, { protocol: -1, create: true })).error,
      /version/i,
    );
    const one = await enter(a, { name: "A", matchmake: true, mode: "blitz" }),
      two = await enter(b, { name: "B", matchmake: true, mode: "blitz" });
    assert.equal(one.code, two.code);
    const privateRoom = await enter(c, { create: true, name: "Private" });
    assert.notEqual(one.code, privateRoom.code);
    const r = server.rooms.get(one.code)!;
    assert.equal(r.publicMatch, true);
    assert.ok(r.startsAt);
    const countdown = r.startsAt;
    a.emit("lobby", { loadout: "blink" });
    await new Promise((res) => setTimeout(res, 80));
    assert.equal(r.players.find((p) => p.id === one.id)?.loadout, "blink");
    assert.equal(r.players.find((p) => p.id === one.id)?.ready, true);
    assert.equal(r.startsAt, countdown, "kit selection preserves the queue countdown");
    a.emit("lobby", { mode: "control", arena: "frost" });
    await new Promise((res) => setTimeout(res, 25));
    assert.equal(r.mode, "blitz");
    a.emit("input", { x: 1, y: 0, angle: 0, sequence: 10 });
    a.emit("input", { x: -1, y: 0, angle: 0, sequence: 9 });
    await new Promise((res) => setTimeout(res, 25));
    assert.equal(r.players.find((p) => p.id === one.id)?.input.x, 1);
    await new Promise<void>((res) => a.emit("leave", () => res()));
    assert.equal(
      r.players.some((p) => p.id === one.id),
      false,
    );
    assert.equal(r.host, two.id);
    assert.match((await enter(a, { token: one.token })).error, /expired/);
    const health = await (await fetch(server.url + "/health")).json();
    assert.equal(health.protocol, PROTOCOL_VERSION);
  } finally {
    clients.forEach((c) => c.disconnect());
    await server.close();
  }
});

test("short action taps survive until a packet; reset and panels cancel actions", async () => {
  const { input, inputPacket, queueAction, resetInput, pauseInput } =
    await import("../src/runtime.js");
  resetInput();
  queueAction("special");
  assert.equal(input.special, false);
  assert.equal(inputPacket(1).special, true);
  assert.equal(inputPacket(2).special, false);
  queueAction("dash");
  resetInput();
  assert.equal(inputPacket(3).dash, false);
  pauseInput(true);
  queueAction("shield");
  assert.equal(inputPacket(4).shield, false);
  pauseInput(false);
});

test("Pulse cannot damage or push an opponent through cover", () => {
  const r = room();
  r.arena = "frost";
  start(r, 0);
  const [a, b] = r.players;
  a.loadout = "pulse";
  a.x = 285;
  a.y = 160;
  b.x = 375;
  b.y = 160;
  a.input.special = true;
  tick(r, 2000, 0.01);
  assert.equal(b.hp, 100);
  assert.equal(b.x, 375);
});


test("Quick Play starts with two, three or four humans and cancels on disconnect", () => {
  for (const count of [2, 3, 4]) {
    const r = room();
    r.publicMatch = true;
    if (count >= 3) r.players.push(player("c", "C", 0));
    if (count === 4) r.players.push(player("d", "D", 1));
    r.players.forEach(p => p.ready = true);
    updateMatchmaking(r, 1000);
    assert.equal(r.startsAt, 6000);
    updateMatchmaking(r, 6000);
    assert.equal(r.phase, "playing");
  }
  const r = room();
  r.publicMatch = true;
  r.players.forEach(p => p.ready = true);
  updateMatchmaking(r, 1000);
  r.players[1].online = false;
  updateMatchmaking(r, 6000);
  assert.equal(r.phase, "lobby");
  assert.equal(r.startsAt, undefined);
});
