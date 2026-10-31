import { test } from "node:test";
import assert from "node:assert/strict";
import { RateLimit, cleanInput, validEnter } from "../server/robustness.js";
import { createGameServer } from "../server/index.js";
import { PROTOCOL_VERSION } from "../server/release.js";
import { io, type Socket } from "socket.io-client";
test("separate bounded token buckets and strict payload sanitation", () => {
  const l = new RateLimit();
  assert.ok(l.allow("create", 1, 1, 0));
  assert.equal(l.allow("create", 1, 1, 1), false);
  assert.ok(l.allow("input", 1, 1, 1));
  assert.ok(l.allow("create", 1, 1, 1000));
  for (const a of [
    null,
    [],
    "bad",
    { x: NaN, y: 0, angle: 0 },
    { x: 1, y: 0, angle: 0, fire: "yes" },
  ])
    assert.equal(cleanInput(a), undefined);
  const a = cleanInput({ x: 100, y: -100, angle: 1e20, fire: true })!;
  assert.equal(a.x, 1);
  assert.equal(a.y, -1);
  assert.ok(Math.abs(a.angle) <= Math.PI);
  assert.equal(validEnter({ create: "yes" }), false);
  assert.equal(validEnter({ name: {} }), false);
  assert.equal(validEnter({ name: "A", create: true }), true);
});
test("atomic reconnect takeover survives superseded disconnect; health reports metrics", async () => {
  const server = await createGameServer({ port: 0, serveClient: false });
  const sockets: Socket[] = [];
  async function connect() {
    const s = io(server.url, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });
    sockets.push(s);
    await new Promise<void>((res, rej) => {
      s.once("connect", res);
      s.once("connect_error", rej);
    });
    return s;
  }
  const enter = (s: Socket, data: any) =>
    new Promise<any>((res, rej) =>
      s
        .timeout(3000)
        .emit(
          "enter",
          { protocol: PROTOCOL_VERSION, ...data },
          (e: any, r: any) => (e ? rej(e) : res(r)),
        ),
    );
  try {
    const a = await connect(),
      first = await enter(a, { create: true });
    const b = await connect(),
      second = await enter(b, { token: first.token });
    assert.equal(second.id, first.id);
    assert.equal(second.code, first.code);
    const r = server.rooms.get(first.code)!;
    assert.equal(r.players.length, 1);
    assert.equal(r.players[0].online, true);
    b.emit("input", { x: 1, y: 0, angle: 0, sequence: 1 });
    await new Promise((res) => setTimeout(res, 40));
    assert.equal(r.players[0].input.x, 1);
    const c = await connect();
    assert.match(
      (await enter(c, { create: true, name: {} })).error,
      /payload/i,
    );
    const h = await (await fetch(server.url + "/health")).json();
    assert.equal(h.rooms, 1);
    assert.equal(h.serverId, h.instance);
    assert.ok(h.memory.rss > 0);
    assert.equal(typeof h.tickMs, "number");
  } finally {
    sockets.forEach((s) => s.disconnect());
    await server.close();
  }
});
