/**
 * Read-only event release verification against ONE deployed server.
 * Usage: npm run event:check -- https://your-service.onrender.com
 * Creates a real public Quick Play lobby with two disposable sockets, then disconnects.
 */
import assert from "node:assert/strict";
import { io, type Socket } from "socket.io-client";
import { PROTOCOL_VERSION, RELEASE_VERSION } from "../server/release.js";

const raw = process.argv[2];
if (!raw) {
  console.error("Usage: npm run event:check -- https://your-service.onrender.com");
  process.exitCode = 2;
} else {
  await check(raw).catch((error: unknown) => {
    console.error("[event:check] FAILED:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

async function check(url: string): Promise<void> {
  const origin = new URL(url);
  assert.ok(["http:", "https:"].includes(origin.protocol), "URL must be http(s)");
  assert.equal(origin.username, "", "Do not embed credentials in the URL");
  assert.equal(origin.password, "", "Do not embed credentials in the URL");
  assert.equal(origin.search, "", "Use the deployment origin, not a query string");
  assert.equal(origin.pathname, "/", "Use the deployment origin, without a path");
  const base = origin.origin;
  const sockets: Socket[] = [];
  const timeout = (ms: number) => AbortSignal.timeout(ms);

  async function get(path: string): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(base + path, { signal: timeout(20000), headers: { "Accept-Encoding": "gzip, br" } });
    } catch (error) {
      throw new Error(`GET ${path}: server unreachable or timed out (possible Render cold start): ${String(error)}`);
    }
    assert.equal(response.status, 200, `GET ${path}: HTTP ${response.status}`);
    return response;
  }

  async function connect(label: string): Promise<{ socket: Socket; instance: string }> {
    const socket = io(base, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      tryAllTransports: true,
      reconnection: false,
      timeout: 15000,
      forceNew: true,
    });
    sockets.push(socket);
    socket.on("probe", (ack: unknown) => { if (typeof ack === "function") ack(); });
    const hello = new Promise<{ protocol: number; instance: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${label}: no server hello within 20s`)), 20000);
      socket.once("hello", (value) => { clearTimeout(timer); resolve(value); });
      socket.once("connect_error", (e: Error) => { clearTimeout(timer); reject(e); });
    });
    socket.connect();
    const greeting = await hello;
    assert.equal(greeting.protocol, PROTOCOL_VERSION, `${label}: protocol mismatch`);
    assert.ok(greeting.instance, `${label}: missing server instance`);
    console.log(`[event:check] ${label} connected via ${socket.io.engine.transport.name}`);
    return { socket, instance: greeting.instance };
  }

  function enter(socket: Socket, label: string): Promise<{ code: string; id: string }> {
    return new Promise((resolve, reject) => {
      socket.timeout(12000).emit("enter", {
        protocol: PROTOCOL_VERSION, matchmake: true, mode: "crystal",
        name: `EventQA ${label}`,
      }, (err: Error | null, response: { code?: string; id?: string; error?: string }) => {
        if (err) return reject(new Error(`${label}: Quick Play ack timed out: ${err.message}`));
        if (response?.error) return reject(new Error(`${label}: Quick Play rejected: ${response.error}`));
        if (!response?.code || !response.id) return reject(new Error(`${label}: malformed join ack`));
        resolve({ code: response.code, id: response.id });
      });
    });
  }

  try {
    console.log(`[event:check] Checking ${base}`);
    const healthResponse = await get("/health");
    assert.match(healthResponse.headers.get("content-type") ?? "", /application\/json/, "/health: JSON content type");
    assert.equal(healthResponse.headers.get("x-content-type-options"), "nosniff", "Missing nosniff response header");
    assert.equal(healthResponse.headers.get("x-powered-by"), null, "Express fingerprint header is enabled");
    const health: any = await healthResponse.json();
    assert.equal(health.ok, true, "/health reports closing/unhealthy");
    assert.equal(health.version, RELEASE_VERSION, "Deployed version differs from local checkout");
    assert.equal(health.protocol, PROTOCOL_VERSION, "Deployed protocol differs from local checkout");
    assert.ok(typeof health.instance === "string" && health.instance.length > 0, "Missing server ID");
    for (const key of ["errors", "tickMs", "maxTickMs", "rooms"]) {
      assert.ok(Number.isFinite(health[key]) && health[key] >= 0, `Invalid /health.${key}`);
    }
    assert.equal(health.errors, 0, `Server has recorded ${health.errors} error(s); inspect Render logs`);
    for (const key of ["rss", "heapUsed", "heapTotal"]) {
      assert.ok(Number.isFinite(health.memory?.[key]) && health.memory[key] > 0, `Invalid /health.memory.${key}`);
    }
    console.log(`[event:check] health v${health.version} protocol ${health.protocol} id=${health.instance} rooms=${health.rooms} tick=${health.tickMs.toFixed(1)}ms RSS=${Math.round(health.memory.rss / 1048576)}MiB errors=0`);

    const statusResponse = await get("/api/status");
    const status: any = await statusResponse.json();
    assert.equal(status.version, RELEASE_VERSION, "/api/status version mismatch");
    assert.equal(status.instance, health.instance, "/health and /api/status have different server instances");
    assert.ok(Number.isInteger(status.online) && status.online >= 0, "Invalid online count");
    assert.ok(Number.isInteger(status.openMatches) && status.openMatches >= 0, "Invalid openMatches count");

    const home = await get("/");
    assert.match(home.headers.get("content-type") ?? "", /text\/html/, "Root is not HTML");
    assert.match(home.headers.get("cache-control") ?? "", /no-cache/, "HTML should not be cached long-term");
    const html = await home.text();
    assert.match(html, /Pixel Rift/i, "Root HTML does not contain Pixel Rift");
    const entry = html.match(/src=["'](\/assets\/[^"']+\.js)["']/);
    assert.ok(entry, "Built HTML does not reference a versioned JavaScript bundle");
    const js = await get(entry[1]);
    assert.match(js.headers.get("content-type") ?? "", /javascript/, "JS asset has wrong content type");
    assert.match(js.headers.get("cache-control") ?? "", /immutable/, "Hashed asset missing immutable caching");
    assert.ok((await js.text()).length > 1000, "JavaScript bundle seems empty");
    console.log("[event:check] status, HTML, JavaScript bundle and cache/security headers OK");

    const first = await connect("A");
    const second = await connect("B");
    assert.equal(first.instance, health.instance, "Client A connected to another instance");
    assert.equal(second.instance, health.instance, "Client B connected to another instance");

    const phases = new Map<string, Set<string>>();
    const waitPlaying = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Quick Play did not auto-start for both clients within 18s")), 18000);
      for (const [label, socket] of [["A", first.socket], ["B", second.socket]] as const) {
        socket.on("state", (snapshot: { code?: string; phase?: string }) => {
          if (!snapshot?.code || !snapshot.phase) return;
          const seen = phases.get(label) ?? new Set<string>();
          if (snapshot.phase === "playing" || snapshot.phase === "overtime") {
            seen.add(snapshot.code);
            phases.set(label, seen);
          }
          if (phases.get("A") && phases.get("B")) {
            const a = phases.get("A")!, b = phases.get("B")!;
            if ([...a].some((code) => b.has(code))) {
              clearTimeout(timer);
              resolve();
            }
          }
        });
        socket.once("disconnect", () => { clearTimeout(timer); reject(new Error(`Client ${label} disconnected before start`)); });
      }
    });
    const a = await enter(first.socket, "A");
    const b = await enter(second.socket, "B");
    assert.equal(a.code, b.code, "Quick Play assigned clients to different room codes");
    assert.notEqual(a.id, b.id, "Both clients received the same player ID");
    await waitPlaying;
    console.log(`[event:check] PASS: two clients joined ${a.code}, auto-started and received authoritative playing snapshots`);
  } finally {
    for (const socket of sockets) {
      if (socket.connected) socket.emit("leave");
      socket.disconnect();
    }
  }
}
