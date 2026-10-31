import assert from "node:assert/strict";
import { io, type Socket } from "socket.io-client";
import { createGameServer } from "../server/index.js";
import { PROTOCOL_VERSION } from "../server/release.js";
process.env.NODE_ENV = "test";
process.env.SIM_LATENCY_MS ??= "200";
process.env.SIM_JITTER_MS ??= "30";
process.env.SIM_LOSS ??= "0.03";
const count = Math.max(2, Math.min(4, Number(process.env.PLAYERS) || 4)),
  server = await createGameServer({ port: 0, serveClient: false });
const clients: Socket[] = [],
  timers: ReturnType<typeof setInterval>[] = [];
let disconnects = 0,
  desyncs = 0,
  snapshots = 0;
const frames = new Map<number, string>();
try {
  for (let i = 0; i < count; i++) {
    const s = io(server.url, {
      transports: ["websocket", "polling"],
      tryAllTransports: true,
      forceNew: true,
      reconnection: false,
    });
    clients.push(s);
    s.on("probe", (ack) => ack());
    s.on("disconnect", () => disconnects++);
    s.on("state", (r) => {
      snapshots++;
      const key = JSON.stringify([r.scores, r.phase, r.winner]);
      if (frames.has(r.now) && frames.get(r.now) !== key) desyncs++;
      frames.set(r.now, key);
      if (frames.size > 1000) frames.delete(frames.keys().next().value!);
    });
    await new Promise<void>((res, rej) => {
      s.once("connect", res);
      s.once("connect_error", rej);
    });
    const joined = await new Promise<any>((res, rej) =>
      s.timeout(10000).emit(
        "enter",
        {
          protocol: PROTOCOL_VERSION,
          matchmake: true,
          mode: "blitz",
          name: `Latency ${i}`,
        },
        (e: any, r: any) => (e ? rej(e) : res(r)),
      ),
    );
    assert.ok(!joined.error, joined.error);
    let sequence = 0;
    const history: any[] = [];
    timers.push(
      setInterval(() => {
        const p = {
          sequence: sequence++,
          x: Math.cos(Date.now() / 2000 + i),
          y: Math.sin(Date.now() / 2000 + i),
          angle: Date.now() / 1500,
          fire: true,
          dash: false,
          shield: false,
          special: false,
        };
        s.volatile.emit("input", { ...p, history: history.slice(-2) });
        history.push(p);
        if (history.length > 3) history.shift();
      }, 33),
    );
  }
  const started = Date.now();
  while (![...server.rooms.values()].some((r) => r.phase === "finished")) {
    if (Date.now() - started > 135000)
      throw new Error("Full match did not finish within 135 seconds");
    await new Promise((r) => setTimeout(r, 250));
  }
  await new Promise((r) => setTimeout(r, 700));
  const health = await (await fetch(server.url + "/health")).json();
  const report = {
    players: count,
    injectedRTT: Number(process.env.SIM_LATENCY_MS) * 2,
    jitter: Number(process.env.SIM_JITTER_MS),
    loss: Number(process.env.SIM_LOSS),
    snapshots,
    disconnects,
    inputRejects: health.inputRejects,
    desyncs,
    elapsedMs: Date.now() - started,
  };
  console.log(JSON.stringify(report, null, 2));
  assert.equal(disconnects, 0);
  assert.equal(desyncs, 0);
  assert.ok(snapshots > 100);
} finally {
  timers.forEach(clearInterval);
  clients.forEach((s) => s.disconnect());
  await server.close();
}
