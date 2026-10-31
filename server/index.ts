import {
  findPublicRoom,
  updateMatchmaking,
  removePlayer,
  validSequence,
  validMode,
  PROTOCOL_VERSION,
  RELEASE_VERSION,
} from "./release.js";
import { manageBots } from "./bots.js";
import express from "express";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { Server } from "socket.io";
import {
  player,
  start,
  tick,
  configure,
  snapshot,
  removeExpiredPlayer,
  type Room,
  loadouts,
} from "./game.js";
import { pathToFileURL } from "node:url";
export async function createGameServer(
  options: { port?: number; serveClient?: boolean } = {},
) {
  const instance = randomBytes(4).toString("hex");
  let closing = false;
  const cleanupTimers = new Set<ReturnType<typeof setTimeout>>();
  let vite: Awaited<ReturnType<typeof import("vite").createServer>> | undefined;
  const app = express(),
    http = createServer(app),
    io = new Server(http, {
      maxHttpBufferSize: 4096,
      pingInterval: 10000,
      pingTimeout: 15000,
    });
  const rooms = new Map<string, Room>();
  const sessions = new Map<string, { code: string; id: string }>();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.get("/health", (_, res) =>
    res.json({
      ok: !closing,
      instance,
      version: RELEASE_VERSION,
      protocol: PROTOCOL_VERSION,
    }),
  );
  app.get("/api/status", (_, res) =>
    res.json({
      version: RELEASE_VERSION,
      instance,
      online: [...rooms.values()].reduce(
        (n, r) => n + r.players.filter((p) => p.online && !p.bot).length,
        0,
      ),
      openMatches: [...rooms.values()].filter(
        (r) => r.publicMatch && r.phase === "lobby",
      ).length,
    }),
  );
  function emit(r: Room) {
    for (const sid of io.sockets.adapter.rooms.get(r.code) ?? []) {
      const socket = io.sockets.sockets.get(sid);
      if (!socket) continue;
      const target = ["playing", "overtime"].includes(r.phase)
        ? socket.volatile
        : socket;
      target.emit("state", snapshot(r, Date.now(), socket.data.playerId));
    }
  }
  io.on("connection", (s) => {
    s.emit("hello", {
      version: RELEASE_VERSION,
      protocol: PROTOCOL_VERSION,
      instance,
    });
    s.on("ping-check", (ack) => {
      if (typeof ack === "function" && ++count <= 100) ack({ now: Date.now() });
    });
    let room: Room | undefined,
      id = "";
    let count = 0,
      joins = 0;
    const rate = setInterval(() => {
      count = 0;
      joins = 0;
    }, 1000);
    s.on("enter", (data, ack) => {
      if (typeof ack !== "function") return;
      if (++joins > 10)
        return ack({ error: "Too many join attempts. Try again shortly." });
      if (data?.protocol !== PROTOCOL_VERSION)
        return ack({
          error: "Game version changed. Reload this page to update.",
        });
      if (room) return ack({ error: "Already in a room" });
      const name =
        String(data?.name || "")
          .trim()
          .slice(0, 18) || "Rifter";
      let token = String(data?.token || "");
      const old = sessions.get(token);
      if (token && !old)
        return ack({
          error:
            "Your session expired or the server restarted. Join a new room.",
        });
      if (old) {
        const r = rooms.get(old.code),
          p = r?.players.find((p) => p.id === old.id);
        if (r && p && !p.online) {
          room = r;
          id = p.id;
          p.online = true;
          p.input = {
            x: 0,
            y: 0,
            angle: 0,
            fire: false,
            dash: false,
            shield: false,
            special: false,
          };
        }
      }
      if (token && !room)
        return ack({
          error: "This player is already connected in another tab.",
        });
      if (!room) {
        const quick = data?.matchmake === true;
        const chosenMode = validMode(data?.mode) ? data.mode : "crystal";
        if (quick) room = findPublicRoom(rooms.values(), chosenMode);
        let code = String(data?.code || "").toUpperCase();
        if (!room && (data?.create || quick)) {
          do {
            code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
          } while (rooms.has(code));
          room = {
            code,
            host: "",
            players: [],
            phase: "lobby",
            arena: "astral",
            mode: quick ? chosenMode : "crystal",
            publicMatch: quick,
            effects: [],
            scores: [0, 0],
            end: 0,
            winner: "",
            bolts: [],
            crystals: [],
            nextCrystal: 0,
            updated: Date.now(),
          };
          rooms.set(code, room);
        } else if (!room) room = rooms.get(code);
        if (!room) return ack({ error: "Room not found" });
        if (room.players.length >= 4) {
          room = undefined;
          return ack({ error: "Room is full" });
        }
        if (room.phase !== "lobby" && room.phase !== "finished") {
          room = undefined;
          return ack({ error: "Match in progress" });
        }
        id = randomUUID();
        const team =
          room.players.filter((p) => p.team === 0).length <=
          room.players.filter((p) => p.team === 1).length
            ? 0
            : 1;
        room.players.push(player(id, name, team));
        if (!room.host) room.host = id;
        token = randomBytes(24).toString("hex");
        sessions.set(token, { code: room.code, id });
      }
      const joined = room.players.find((p) => p.id === id)!;
      if (room.publicMatch && room.phase === "lobby") joined.ready = true;
      joined.lastSequence = -1;
      s.data.playerId = id;
      s.join(room.code);
      if (!room.players.some((p) => p.id === room!.host && p.online))
        room.host = id;
      room.updated = Date.now();
      ack({ id, token, code: room.code });
      updateMatchmaking(room, Date.now());
      emit(room);
    });
    s.on("leave", (ack) => {
      if (room) {
        const oldRoom = room;
        s.leave(oldRoom.code);
        removePlayer(oldRoom, id, sessions);
        oldRoom.updated = Date.now();
        room = undefined;
        id = "";
        s.data.playerId = undefined;
        emit(oldRoom);
      }
      if (typeof ack === "function") ack({ ok: true });
    });
    s.on("lobby", (a) => {
      if (!room || ++count > 60 || !["lobby", "finished"].includes(room.phase))
        return;
      const p = room.players.find((p) => p.id === id);
      if (!p) return;
      if (!room.publicMatch) configure(room, id, a ?? {});
      if (!room.publicMatch && typeof a?.bots === "boolean")
        manageBots(room, id, a.bots);
      if (
        typeof a?.loadout === "string" &&
        Object.hasOwn(loadouts, a.loadout)
      ) {
        p.loadout = a.loadout;
        // Public entrants are already queued; selecting a kit must not unqueue them.
        if (!room.publicMatch) p.ready = false;
      }
      if (!room.publicMatch && (a?.team === 0 || a?.team === 1)) {
        if (
          room.players.filter((x) => x.team === a.team && x.id !== id).length <
          2
        ) {
          p.team = a.team;
          p.ready = false;
        }
      }
      if (typeof a?.ready === "boolean") p.ready = a.ready;
      if (a?.start && room.host === id) {
        const ps = room.players.filter((x) => x.online);
        if (
          ps.length >= 2 &&
          ps.every((x) => x.ready) &&
          ps.some((x) => x.team === 0) &&
          ps.some((x) => x.team === 1)
        )
          start(room, Date.now());
      }
      emit(room);
    });
    s.on("input", (a) => {
      if (!room || ++count > 100) return;
      const p = room.players.find((p) => p.id === id);
      if (!p || !a || ![a.x, a.y, a.angle].every(Number.isFinite)) return;
      if (!validSequence(a.sequence, p.lastSequence ?? -1)) return;
      if (a.sequence !== undefined) p.lastSequence = a.sequence;
      p.lastInput = Date.now();
      p.input = {
        x: Math.max(-1, Math.min(1, a.x)),
        y: Math.max(-1, Math.min(1, a.y)),
        angle: a.angle,
        fire: !!a.fire,
        dash: !!a.dash,
        shield: !!a.shield,
        special: !!a.special,
      };
    });
    s.on("disconnect", () => {
      clearInterval(rate);
      if (!room || closing) return;
      const p = room.players.find((p) => p.id === id);
      if (p) {
        p.online = false;
        p.lastInput = Date.now();
        p.input.fire = false;
        p.input.x = p.input.y = 0;
      }
      if (room.host === id)
        room.host = room.players.find((p) => p.online && !p.bot)?.id || id;
      room.updated = Date.now();
      emit(room);
      const r = room,
        disconnectedAt = p?.lastInput;
      const timeout = setTimeout(() => {
        cleanupTimers.delete(timeout);
        if (removeExpiredPlayer(r, id, disconnectedAt, sessions)) emit(r);
      }, 30000);
      cleanupTimers.add(timeout);
    });
  });
  let last = Date.now(),
    frames = 0;
  const loop = setInterval(() => {
    const now = Date.now(),
      dt = Math.min((now - last) / 1000, 0.06);
    last = now;
    frames++;
    for (const [code, r] of rooms) {
      updateMatchmaking(r, now);
      tick(r, now, dt);
      if (frames % 2 === 0) emit(r);
      if (
        r.players.every((p) => p.bot || !p.online) &&
        now - r.updated > 600000
      ) {
        rooms.delete(code);
        for (const [t, s] of sessions) if (s.code === code) sessions.delete(t);
      }
    }
  }, 1000 / 30);
  if (options.serveClient !== false) {
    if (process.env.NODE_ENV === "production") app.use(express.static("dist"));
    else {
      const { createServer } = await import("vite");
      vite = await createServer({
        server: { middlewareMode: true, allowedHosts: ["terminal.local"] },
        appType: "spa",
      });
      app.use(vite.middlewares);
    }
  }
  const cliPortIndex = process.argv.indexOf("--port");
  const port =
    options.port ??
    (Number(
      process.env.PORT ||
        (cliPortIndex >= 0 ? process.argv[cliPortIndex + 1] : 3000),
    ) ||
      3000);
  await new Promise<void>((resolve, reject) => {
    http.once("error", reject);
    http.listen(port, "0.0.0.0", () => {
      http.off("error", reject);
      resolve();
    });
  });
  const address = http.address() as import("node:net").AddressInfo;
  return {
    http,
    io,
    rooms,
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      closing = true;
      io.emit("server-closing", {
        message: "Server is updating. Rooms reset; please reconnect shortly.",
      });
      clearInterval(loop);
      for (const timer of cleanupTimers) clearTimeout(timer);
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await vite?.close();
    },
  };
}
if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  const game = await createGameServer();
  console.log(
    `Pixel Rift listening on ${game.url.replace("127.0.0.1", "localhost")}`,
  );
}
