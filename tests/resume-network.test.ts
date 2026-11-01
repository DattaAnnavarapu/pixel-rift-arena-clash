import { test } from "node:test";
import assert from "node:assert/strict";
import { io, type Socket } from "socket.io-client";
import { createGameServer } from "../server/index.js";
import { PROTOCOL_VERSION } from "../server/release.js";

test("lost resume acknowledgement: same socket can retry without changing player identity", async () => {
  const server = await createGameServer({ port: 0, serveClient: false });
  const sockets: Socket[] = [];
  async function connect() {
    const s = io(server.url, { forceNew: true, reconnection: false, transports: ["websocket"] });
    sockets.push(s);
    await new Promise<void>((resolve, reject) => { s.once("connect", resolve); s.once("connect_error", reject); });
    return s;
  }
  const enter = (s: Socket, data: Record<string, unknown>) => new Promise<any>((resolve, reject) => {
    s.timeout(3000).emit("enter", { protocol: PROTOCOL_VERSION, ...data },
      (error: Error | null, reply: any) => error ? reject(error) : resolve(reply));
  });
  try {
    const a = await connect();
    const original = await enter(a, { create: true, name: "ResumeTest" });
    const b = await connect();
    const first = await enter(b, { token: original.token });
    assert.equal(first.id, original.id);
    const retry = await enter(b, { token: original.token });
    assert.deepEqual(retry, first);
    assert.equal(server.rooms.get(original.code)?.players.length, 1);
    const c = await connect();
    const forbidden = await enter(c, { token: original.token, create: true, practice: true });
    assert.match(forbidden.error, /Practice requires a private room/);
    assert.equal(server.rooms.get(original.code)?.players.length, 1);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await server.close();
  }
});
