import { test } from "node:test";
import assert from "node:assert/strict";
import { io, type Socket } from "socket.io-client";
import { createGameServer } from "../server/index.js";
const enter = (s: Socket, data: any) =>
  new Promise<any>((resolve, reject) =>
    s
      .timeout(4000)
      .emit("enter", data, (e: any, r: any) => (e ? reject(e) : resolve(r))),
  );
const state = (s: Socket, predicate: (r: any) => boolean) =>
  new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => {
      s.off("state", fn);
      reject(Error("snapshot timeout"));
    }, 5000);
    const fn = (r: any) => {
      if (predicate(r)) {
        clearTimeout(timeout);
        s.off("state", fn);
        resolve(r);
      }
    };
    s.on("state", fn);
  });
test("four real clients: capacity, readiness, sync, isolation, host migration, resume", async () => {
  const server = process.env.TEST_URL
    ? undefined
    : await createGameServer({ port: 0, serveClient: false });
  const url = process.env.TEST_URL ?? server!.url;
  const clients: Socket[] = [];
  const client = async () => {
    const s = io(url!, {
      forceNew: true,
      transports: ["websocket"],
      reconnection: false,
    });
    clients.push(s);
    await new Promise<void>((resolve, reject) => {
      s.once("connect", resolve);
      s.once("connect_error", reject);
    });
    return s;
  };
  try {
    const a = await client(),
      b = await client(),
      c = await client(),
      d = await client(),
      e = await client();
    const first = await enter(a, { create: true, name: "Alpha" });
    assert.match(first.code, /^[A-F0-9]{6}$/);
    const bs = await enter(b, { code: first.code, name: "Beta" });
    await enter(c, { code: first.code, name: "Gamma" });
    await enter(d, { code: first.code, name: "Delta" });
    assert.match((await enter(e, { code: first.code })).error, /full/);
    a.emit("lobby", { start: true });
    const lobby = await state(b, (r) => r.phase === "lobby");
    assert.equal(lobby.players.length, 4);
    const other = await enter(e, { create: true, name: "Other" });
    assert.notEqual(other.code, first.code);
    a.emit("lobby", { arena: "grove", mode: "control" });
    await state(b, (r) => r.arena === "grove" && r.mode === "control");
    b.emit("lobby", { arena: "ember", mode: "knockout", loadout: "mend" });
    const configured = await state(
      a,
      (r) => r.players.find((p: any) => p.id === bs.id).loadout === "mend",
    );
    assert.equal(configured.arena, "grove");
    assert.equal(configured.mode, "control");
    for (const s of [a, b, c, d]) s.emit("lobby", { ready: true });
    await state(a, (r) => r.players.every((p: any) => p.ready));
    const pa = state(a, (r) => r.phase === "playing"),
      pb = state(b, (r) => r.phase === "playing");
    a.emit("lobby", { start: true });
    const [ra, rb] = await Promise.all([pa, pb]);
    assert.deepEqual(ra.scores, rb.scores);
    assert.equal(ra.arena, rb.arena);
    assert.equal(ra.mode, "control");
    const old = ra.players.find((p: any) => p.id === first.id).x;
    a.emit("input", { x: 999, y: 0, angle: 0, fire: true });
    const moved = await state(
      b,
      (r) => r.players.find((p: any) => p.id === first.id).x > old + 5,
    );
    assert.ok(moved.players.find((p: any) => p.id === first.id).x < old + 100);
    b.disconnect();
    await state(a, (r) =>
      r.players.some((p: any) => p.id === bs.id && !p.online),
    );
    const resume = await client();
    const again = await enter(resume, { token: bs.token });
    assert.equal(again.id, bs.id);
    const restored = await state(
      resume,
      (r) => r.players.find((p: any) => p.id === bs.id)?.online,
    );
    assert.equal(
      restored.players.find((p: any) => p.id === bs.id).loadout,
      "mend",
    );
    a.disconnect();
    const migrated = await state(c, (r) => r.host !== first.id);
    assert.ok(
      migrated.players.some((p: any) => p.id === migrated.host && p.online),
    );
    const isolated = await state(e, (r) => r.code === other.code);
    assert.equal(isolated.players.length, 1);
  } finally {
    clients.forEach((s) => s.disconnect());
    await server?.close();
  }
});
