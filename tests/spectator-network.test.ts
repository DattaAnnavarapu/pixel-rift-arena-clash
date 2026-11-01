import { test } from "node:test";
import assert from "node:assert/strict";
import { io, type Socket } from "socket.io-client";
import { createGameServer } from "../server/index.js";
import { PROTOCOL_VERSION } from "../server/release.js";
const enter = (s: Socket, data: any) =>
  new Promise<any>((resolve, reject) =>
    s
      .timeout(3000)
      .emit(
        "enter",
        { protocol: PROTOCOL_VERSION, ...data },
        (e: any, r: any) => (e ? reject(e) : resolve(r)),
      ),
  );
const state = (s: Socket, p: (r: any) => boolean) =>
  new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => {
      s.off("state", fn);
      reject(Error("state timeout"));
    }, 4000);
    const fn = (r: any) => {
      if (p(r)) {
        clearTimeout(timer);
        s.off("state", fn);
        resolve(r);
      }
    };
    s.on("state", fn);
  });
test("full-room spectators join mid-match, cannot mutate, receive synced flags and clean up", async () => {
  const server = await createGameServer({ port: 0, serveClient: false });
  const clients: Socket[] = [];
  const client = async () => {
    const s = io(server.url!, {
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
  };
  try {
    const a = await client();
    const first = await enter(a, { create: true, name: "Host" });
    for (let i = 0; i < 3; i++) {
      const s = await client();
      await enter(s, { code: first.code, name: "Player" + i });
    }
    a.emit("lobby", { mode: "ctf" });
    await state(a, (r) => r.mode === "ctf");
    for (const s of clients) s.emit("lobby", { ready: true });
    await state(a, (r) => r.players.every((p: any) => p.ready));
    a.emit("lobby", { start: true });
    await state(a, (r) => r.phase === "playing");
    const watcher = await client();
    const w = await enter(watcher, {
      code: first.code,
      spectate: true,
      name: "Viewer",
    });
    assert.equal(w.spectating, true);
    assert.equal(w.token, undefined);
    watcher.emit("lobby", { mode: "knockout", start: true, team: 0 });
    watcher.emit("input", { x: 1, y: 1, angle: 0, fire: true });
    const s = await state(watcher, (r) => r.spectators?.length === 1);
    assert.equal(s.players.length, 4);
    assert.equal(s.mode, "ctf");
    assert.equal(s.arena, "citadel");
    assert.equal(s.flags.length, 2);
    assert.equal(s.host, first.id);
    const normal = await client();
    assert.match((await enter(normal, { code: first.code })).error, /full/);
    for (let i = 0; i < 7; i++) {
      const v = await client();
      assert.equal(
        (await enter(v, { code: first.code, spectate: true })).spectating,
        true,
      );
    }
    const extra = await client();
    assert.match(
      (await enter(extra, { code: first.code, spectate: true })).error,
      /full/,
    );
    const cleaned = state(a, (r) => r.spectators?.length === 7);
    watcher.disconnect();
    await cleaned;
    assert.equal(
      (await enter(extra, { code: first.code, spectate: true })).spectating,
      true,
    );
  } finally {
    clients.forEach((s) => s.disconnect());
    await server.close();
  }
});
