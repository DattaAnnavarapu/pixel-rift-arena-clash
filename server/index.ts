import express from "express";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { player, start, tick, type Room } from "./game.js";
const app = express(),
  http = createServer(app),
  io = new Server(http, { maxHttpBufferSize: 4096 });
export const rooms = new Map<string, Room>();
const sessions = new Map<string, { code: string; id: string }>();
app.get("/health", (_, res) => res.json({ ok: true, rooms: rooms.size }));
function emit(r: Room) {
  const { updated, ...state } = r;
  io.to(r.code).emit("state", { ...state, now: Date.now() });
}
io.on("connection", (s) => {
  let room: Room | undefined,
    id = "";
  let count = 0;
  const rate = setInterval(() => (count = 0), 1000);
  s.on("enter", (data, ack) => {
    if (++count > 10 || typeof ack !== "function") return;
    if (room) return ack({ error: "Already in a room" });
    const name =
      String(data?.name || "")
        .trim()
        .slice(0, 18) || "Rifter";
    let token = String(data?.token || "");
    const old = sessions.get(token);
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
        };
      }
    }
    if (!room) {
      let code = String(data?.code || "").toUpperCase();
      if (data?.create) {
        do {
          code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
        } while (rooms.has(code));
        room = {
          code,
          host: "",
          players: [],
          phase: "lobby",
          scores: [0, 0],
          end: 0,
          winner: "",
          bolts: [],
          crystals: [],
          nextCrystal: 0,
          updated: Date.now(),
        };
        rooms.set(code, room);
      } else room = rooms.get(code);
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
    s.join(room.code);
    room.updated = Date.now();
    ack({ id, token, code: room.code });
    emit(room);
  });
  s.on("lobby", (a) => {
    if (!room || ++count > 60 || !["lobby", "finished"].includes(room.phase))
      return;
    const p = room.players.find((p) => p.id === id);
    if (!p) return;
    if (a?.team === 0 || a?.team === 1) {
      if (
        room.players.filter((x) => x.team === a.team && x.id !== id).length < 2
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
    p.input = {
      x: Math.max(-1, Math.min(1, a.x)),
      y: Math.max(-1, Math.min(1, a.y)),
      angle: a.angle,
      fire: !!a.fire,
      dash: !!a.dash,
      shield: !!a.shield,
    };
  });
  s.on("disconnect", () => {
    clearInterval(rate);
    if (!room) return;
    const p = room.players.find((p) => p.id === id);
    if (p) {
      p.online = false;
      p.input.fire = false;
      p.input.x = p.input.y = 0;
    }
    if (room.host === id)
      room.host = room.players.find((p) => p.online)?.id || id;
    room.updated = Date.now();
    emit(room);
    const r = room;
    setTimeout(() => {
      const p = r.players.find((p) => p.id === id);
      if (p && !p.online) {
        r.players = r.players.filter((x) => x.id !== id);
        emit(r);
      }
    }, 30000);
  });
});
let last = Date.now(),
  frames = 0;
setInterval(() => {
  const now = Date.now(),
    dt = Math.min((now - last) / 1000, 0.06);
  last = now;
  frames++;
  for (const [code, r] of rooms) {
    tick(r, now, dt);
    if (frames % 2 === 0) emit(r);
    if (r.players.every((p) => !p.online) && now - r.updated > 600000) {
      rooms.delete(code);
      for (const [t, s] of sessions) if (s.code === code) sessions.delete(t);
    }
  }
}, 1000 / 30);
if (process.env.NODE_ENV === "production") app.use(express.static("dist"));
else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true, allowedHosts: ["terminal.local"] },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
http.listen(
  Number(
    process.env.PORT || process.argv[process.argv.indexOf("--port") + 1],
  ) || 3000,
  "0.0.0.0",
  () => console.log("Pixel Rift listening"),
);
