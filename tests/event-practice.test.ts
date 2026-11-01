import { test } from "node:test";
import assert from "node:assert/strict";
import { io, type Socket } from "socket.io-client";
import { createGameServer } from "../server/index.js";
import { PROTOCOL_VERSION } from "../server/release.js";
import { validEnter } from "../server/robustness.js";

test("private practice payload whitelist and quick-play isolation", async () => {
  assert.equal(validEnter({ create: true, practice: true, botLevel: "hard" }), true);
  assert.equal(validEnter({ create: true, practice: "yes" }), false);
  assert.equal(validEnter({ create: true, practice: true, botLevel: "training" }), false);
  const server = await createGameServer({ port: 0, serveClient: false });
  const sockets: Socket[] = [];
  const client = async () => {
    const s = io(server.url, { forceNew: true, transports: ["websocket"], reconnection: false });
    sockets.push(s);
    await new Promise<void>((resolve, reject) => {
      s.once("connect", resolve); s.once("connect_error", reject);
    });
    return s;
  };
  const enter = (s: Socket, options: Record<string, unknown>) =>
    new Promise<any>((resolve, reject) => s.timeout(5000).emit("enter", { protocol: PROTOCOL_VERSION, ...options }, (error: any, reply: any) => error ? reject(error) : resolve(reply)));
  try {
    const a = await client();
    const practice = await enter(a, { create: true, practice: true, botLevel: "hard" });
    assert.ok(practice.code);
    const room = server.rooms.get(practice.code)!;
    assert.equal(room.publicMatch, false);
    assert.equal(room.botLevel, "hard");
    assert.equal(room.phase, "playing");
    assert.equal(room.players.filter((p) => p.bot).length, 3);
    assert.ok(room.players.every((p) => p.ready));
    const b = await client();
    const quick = await enter(b, { matchmake: true, mode: "crystal" });
    assert.notEqual(quick.code, practice.code);
    const c = await client();
    const invalid = await enter(c, { create: true, practice: true, botLevel: "training" });
    assert.match(invalid.error, /Invalid join payload/);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await server.close();
  }
});
