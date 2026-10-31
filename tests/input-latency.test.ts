import { test } from "node:test";
import assert from "node:assert/strict";
import { joystickVector } from "../src/joystick.js";
import {
  replayPosition,
  advancePosition,
  type SentInput,
} from "../src/prediction.js";
import {
  player,
  snapshot,
  blocked,
  type Room,
  type Input,
} from "../server/game.js";
import { createGameServer } from "../server/index.js";
import { PROTOCOL_VERSION } from "../server/release.js";
import { io, type Socket } from "socket.io-client";
const right: Input = {
  x: 1,
  y: 0,
  angle: 0,
  fire: false,
  dash: false,
  shield: false,
  special: false,
};
function view() {
  const p = player("a", "A", 0);
  p.x = 400;
  p.y = 300;
  p.lastSequence = 9;
  const room: Room = {
    code: "TEST",
    host: "a",
    players: [p],
    phase: "playing",
    scores: [0, 0],
    end: 100000,
    winner: "",
    bolts: [],
    crystals: [],
    nextCrystal: 0,
    updated: 0,
    arena: "astral",
    mode: "crystal",
  };
  return snapshot(room, 5000).players[0];
}
test("joystick dead zone prevents drift and center aim; diagonals stay normalized", () => {
  assert.deepEqual(joystickVector(0, 0, 50), { x: 0, y: 0, active: false });
  assert.equal(joystickVector(5, -4, 50).active, false);
  const v = joystickVector(100, 100, 50);
  assert.ok(Math.abs(Math.hypot(v.x, v.y) - 1) < 1e-8);
  assert.ok(v.x > 0 && v.y > 0);
  assert.equal(joystickVector(NaN, 0, 50).active, false);
});
test("prediction replays only unacknowledged movement at 50–250ms latency", () => {
  for (const latency of [50, 150, 250]) {
    const p = view();
    const history: SentInput[] = [
      { sequence: 9, at: 0, input: { ...right, x: -1 } },
      { sequence: 10, at: 1000 - latency, input: right },
    ];
    const predicted = replayPosition(p, history, 1000, 5000, "astral");
    assert.ok(Math.abs(predicted.x - (400 + (175 * latency) / 1000)) < 0.01);
    assert.equal(predicted.y, 300);
    p.lastSequence = 10;
    assert.equal(replayPosition(p, history, 1000, 5000, "astral").x, 400);
  }
});
test("prediction handles direction changes, stale history, and cover", () => {
  const p = view();
  const predicted = replayPosition(
    p,
    [
      { sequence: 10, at: 800, input: right },
      { sequence: 11, at: 900, input: { ...right, x: -1 } },
    ],
    1000,
    5000,
    "astral",
  );
  assert.ok(Math.abs(predicted.x - 400) < 0.01);
  const capped = replayPosition(
    p,
    [{ sequence: 10, at: 0, input: right }],
    1000,
    5000,
    "astral",
  );
  assert.ok(capped.x <= 452.51);
  p.x = 285;
  p.y = 160;
  const wall = replayPosition(
    p,
    [{ sequence: 10, at: 700, input: right }],
    1000,
    5000,
    "frost",
  );
  assert.equal(blocked(wall.x, wall.y, 13, "frost"), false);
  assert.ok(wall.x < 288);
  const local = { x: 400, y: 300 };
  advancePosition(local, view(), right, 5000, 1 / 60, "astral");
  assert.ok(local.x > 402, "local movement responds on the first frame");
});
test("aim-stick fire is included in packets and reset cancels it", async () => {
  const { touch, input, inputPacket, resetInput, identify, sentInputs } =
    await import("../src/runtime.js");
  identify("a");
  resetInput();
  touch.firing = true;
  input.angle = 1.2;
  const packet = inputPacket(12, 1000);
  assert.equal(packet.fire, true);
  assert.equal(packet.angle, 1.2);
  assert.equal(sentInputs.at(-1)?.sequence, 12);
  touch.firing = false;
  assert.equal(inputPacket(13, 1016).fire, false);
  touch.firing = true;
  resetInput();
  assert.equal(inputPacket(14, 1032).fire, false);
  identify("");
  assert.equal(sentInputs.length, 0);
});
test("polling-only clients can match and receive authoritative movement snapshots", async () => {
  const server = await createGameServer({ port: 0, serveClient: false });
  const clients: Socket[] = [];
  try {
    async function connect(name: string) {
      const c = io(server.url, {
        transports: ["polling"],
        reconnection: false,
        forceNew: true,
      });
      clients.push(c);
      await new Promise<void>((resolve, reject) => {
        c.once("connect", resolve);
        c.once("connect_error", reject);
      });
      const joined = await new Promise<any>((resolve, reject) =>
        c.timeout(3000).emit(
          "enter",
          {
            protocol: PROTOCOL_VERSION,
            matchmake: true,
            mode: "crystal",
            name,
          },
          (err: Error | null, r: any) => (err ? reject(err) : resolve(r)),
        ),
      );
      return { c, joined };
    }
    const a = await connect("A"),
      b = await connect("B");
    assert.equal(a.joined.code, b.joined.code);
    const r = server.rooms.get(a.joined.code)!;
    assert.ok(r.startsAt);
    r.startsAt = Date.now();
    const active = await new Promise<any>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("No playing snapshot over polling")),
        3000,
      );
      b.c.on("state", (s) => {
        if (s.phase === "playing") {
          clearTimeout(timer);
          resolve(s);
        }
      });
    });
    const startX = active.players.find((p: any) => p.id === a.joined.id).x;
    a.c.emit("input", { ...right, sequence: 0 });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Movement not synchronized over polling")),
        3000,
      );
      b.c.on("state", (s) => {
        if (s.players.find((p: any) => p.id === a.joined.id)?.x > startX) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    const status = await (await fetch(server.url + "/api/status")).json();
    assert.equal(typeof status.instance, "string");
  } finally {
    clients.forEach((c) => c.disconnect());
    await server.close();
  }
});
