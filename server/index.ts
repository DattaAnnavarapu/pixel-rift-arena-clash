import { InputLatch } from "./input-latch.js";
import { isEmote } from "./social.js";
import { setupTutorial, skipTutorialStep } from "./tutorial.js";
import { isBotLevel } from "./bot-config.js";
import { FaultLink } from "./network.js";
import compression from "compression";
import { performance } from "node:perf_hooks";
import {
  RateLimit,
  record,
  validEnter,
  cleanInput,
  installProcessLogging,
} from "./robustness.js";
import { isClass, isWeapon, maxHealth, weapons } from "./combat.js";
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
  const faults = new FaultLink();
  const inputLatch = new InputLatch();
  const instance = randomBytes(4).toString("hex");
  let closing = false;
  const owners = new Map<string, string>(),
    offlineSince = new Map<string, number>();
  const metrics = { tickMs: 0, maxTickMs: 0, errors: 0, inputRejects: 0 };
  const report = (kind: string, error: unknown) => {
    metrics.errors++;
    console.error(`[${instance}] ${kind}`, error);
  };
  const cleanupTimers = new Set<ReturnType<typeof setTimeout>>();
  let vite: Awaited<ReturnType<typeof import("vite").createServer>> | undefined;
  const app = express(),
    http = createServer(app),
    io = new Server(http, {
      maxHttpBufferSize: 100 * 1024,
      pingInterval: 10000,
      pingTimeout: 25000,
      perMessageDeflate: false,
    });
  const rooms = new Map<string, Room>();
  const sessions = new Map<string, { code: string; id: string }>();
  app.disable("x-powered-by");
  app.use(compression());
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  // A minimal, allocation-free response for external wake/uptime probes.
  app.get("/ping", (_req, res) => res.status(200).type("text/plain").send("pong"));
  app.get("/health", (_, res) =>
    res.json({
      ok: !closing,
      serverId: instance,
      rooms: rooms.size,
      memory: process.memoryUsage(),
      ...metrics,
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
      const view = structuredClone(
        snapshot(r, Date.now(), socket.data.playerId),
      );
      faults.send(() => {
        if (socket.connected && socket.rooms.has(r.code))
          target.emit("state", view);
      }, ["playing", "overtime"].includes(r.phase));
    }
  }
  io.on("connection", (s) => {
    const limits = new RateLimit();
    const on = (event: string, handler: (...args: any[]) => void) =>
      s.on(event, (...args: any[]) => {
        try {
          const delayed = args.map((arg) =>
            typeof arg === "function"
              ? (...reply: any[]) => faults.send(() => arg(...reply))
              : arg,
          );
          if (event === "disconnect") handler(...delayed);
          else
            faults.send(() => {
              try {
                if (s.connected) handler(...delayed);
              } catch (error) {
                report(`delayed:${event}`, error);
              }
            }, event === "input");
        } catch (error) {
          report(`socket:${event}`, error);
          const ack = args.at(-1);
          if (typeof ack === "function")
            ack({ error: "Request failed. Please retry." });
        }
      });

    s.emit("hello", {
      version: RELEASE_VERSION,
      protocol: PROTOCOL_VERSION,
      instance,
    });
    on("ping-check", (ack) => {
      if (typeof ack === "function" && limits.allow("ping", 1, 5))
        ack({ now: Date.now() });
    });
    const probe = () =>
      faults.send(() => {
        if (!s.connected) return;
        const at = Date.now();
        s.timeout(5000).emit("probe", (err: unknown) =>
          faults.send(() => {
            if (!err) {
              s.data.rtt = Math.max(
                0,
                Math.min(2000, Date.now() - at + faults.profile.latency),
              );
              const p = room?.players.find((p) => p.id === id);
              if (p) p.rtt = s.data.rtt;
            }
          }),
        );
      });
    const probeTimer = setInterval(probe, 2500);
    probe();
    let room: Room | undefined,
      id = "";
    let count = 0,
      joins = 0;

    on("enter", (data, ack) => {
      if (typeof ack !== "function") return;
      if (!limits.allow("join", 1, 10))
        return ack({ error: "Too many join attempts. Try again shortly." });
      if (data?.protocol !== PROTOCOL_VERSION)
        return ack({
          error: "Game version changed. Reload this page to update.",
        });
      if (data?.mode !== undefined && !validMode(data.mode))
        return ack({ error: "Unknown mode" });
      if (!validEnter(data)) return ack({ error: "Invalid join payload" });
      if (data.create && !limits.allow("create", 0.2, 3))
        return ack({ error: "Too many room creations" });
      if (data.matchmake && !limits.allow("quick", 0.5, 5))
        return ack({ error: "Too many Quick Play attempts" });
      if (room) return ack({ error: "Already in a room" });
      if (data.practice === true && (data.create !== true || data.matchmake === true || data.tutorial === true))
        return ack({ error: "Practice requires a private room" });
      if (
        data.tutorial === true &&
        (data.matchmake === true || data.create !== true)
      )
        return ack({ error: "Tutorial must be a private creation" });
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
        if (
          r &&
          p &&
          (!offlineSince.has(p.id) ||
            Date.now() - offlineSince.get(p.id)! <= 30000)
        ) {
          const previous = io.sockets.sockets.get(owners.get(p.id) ?? "");
          if (previous && previous.id !== s.id) {
            previous.data.superseded = true;
            previous.disconnect(true);
          }
          offlineSince.delete(p.id);
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
        if (quick)
          room = findPublicRoom(rooms.values(), chosenMode, s.data.rtt);
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
            tutorial: data.tutorial === true,
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
        if (room.tutorial && room.players.length > 0) {
          room = undefined;
          return ack({ error: "Tutorial rooms cannot be joined by code" });
        }
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
      if (room.tutorial && !room.tutorialState) setupTutorial(room, Date.now());
      if (data.practice === true) {
        room.botLevel = isBotLevel(data.botLevel) ? data.botLevel : "normal";
        manageBots(room, id, true);
        joined.ready = true;
        // Server owns readiness, teams, bot assignment and match start.
        if (room.players.some((p) => p.team === 0) && room.players.some((p) => p.team === 1))
          start(room, Date.now());
      }
      inputLatch.consume(joined);
      joined.lastSequence = -1;
      joined.rtt = s.data.rtt;
      owners.set(id, s.id);
      offlineSince.delete(id);
      s.data.playerId = id;
      s.join(room.code);
      if (!room.players.some((p) => p.id === room!.host && p.online))
        room.host = id;
      room.updated = Date.now();
      ack({ id, token, code: room.code });
      updateMatchmaking(room, Date.now());
      emit(room);
    });
    on("leave", (ack) => {
      if (!limits.allow("leave", 2, 4)) return;
      if (room) {
        owners.delete(id);
        offlineSince.delete(id);
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
    on("lobby", (a) => {
      if (
        !record(a) ||
        !room ||
        !limits.allow("lobby", 30, 60) ||
        !["lobby", "finished"].includes(room.phase)
      )
        return;
      const p = room.players.find((p) => p.id === id);
      if (!p) return;
      if (!room.publicMatch) configure(room, id, a ?? {});
      if (!room.publicMatch && room.host === id && isBotLevel(a.botLevel)) {
        room.botLevel = a.botLevel;
        let kit = 0;
        for (const bot of room.players.filter((p) => p.bot)) {
          bot.botLevel = a.botLevel;
          if (a.botLevel === "hard") {
            bot.classId = (["assault", "tank", "scout"] as const)[kit % 3];
            bot.weaponId = (["blaster", "shotgun", "rifle"] as const)[kit % 3];
            bot.loadout = (["nova", "mend", "pulse", "blink"] as const)[
              kit % 4
            ];
            bot.hp = maxHealth(bot);
            bot.ammo = weapons[bot.weaponId].magazine;
            kit++;
          }
          if (a.botLevel === "easy") {
            bot.classId = "assault";
            bot.weaponId = "blaster";
            bot.hp = maxHealth(bot);
            bot.ammo = weapons.blaster.magazine;
          }
        }
      }
      if (!room.publicMatch && typeof a?.bots === "boolean")
        manageBots(room, id, a.bots);
      if (
        typeof a?.loadout === "string" &&
        Object.hasOwn(loadouts, a.loadout)
      ) {
        p.loadout = a.loadout as keyof typeof loadouts;
        // Public entrants are already queued; selecting a kit must not unqueue them.
        if (!room.publicMatch) p.ready = false;
      }
      if (isClass(a?.classId)) {
        p.classId = a.classId;
        p.hp = maxHealth(p);
        if (!room.publicMatch) p.ready = false;
      }
      if (isWeapon(a?.weaponId)) {
        p.weaponId = a.weaponId;
        p.ammo = weapons[p.weaponId].magazine;
        p.reloadAt = 0;
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
      if (a?.start === true && room.host === id) {
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
    on("emote", (a) => {
      if (!room || !record(a) || !isEmote(a.id) || !limits.allow("emote", 1, 2))
        return;
      const p = room.players.find((p) => p.id === id);
      if (p) p.emote = { id: a.id, until: Date.now() + 2500 };
    });
    on("tutorial", (a) => {
      if (
        !room?.tutorial ||
        room.host !== id ||
        !record(a) ||
        !limits.allow("tutorial", 2, 4)
      )
        return;
      if (a.action === "replay") setupTutorial(room, Date.now());
      if (a.action === "skip") skipTutorialStep(room, Date.now());
      if (
        a.action === "choose" &&
        room.tutorialState?.step === 0 &&
        isClass(a.classId) &&
        isWeapon(a.weaponId) &&
        typeof a.loadout === "string" &&
        Object.hasOwn(loadouts, a.loadout)
      ) {
        const p = room.players.find((p) => p.id === id)!;
        p.classId = a.classId;
        p.weaponId = a.weaponId;
        p.loadout = a.loadout as keyof typeof loadouts;
        p.hp = maxHealth(p);
        p.ammo = weapons[p.weaponId].magazine;
        skipTutorialStep(room, Date.now());
      }
      emit(room);
    });
    on("input", (a) => {
      if (!room || !limits.allow("input", 100, 150)) {
        metrics.inputRejects++;
        return;
      }
      const p = room.players.find((p) => p.id === id);
      if (!p) return;
      if (
        a?.history !== undefined &&
        (!Array.isArray(a.history) || a.history.length > 3)
      ) {
        metrics.inputRejects++;
        return;
      }
      const batch = [...(a?.history ?? []), a].map(cleanInput);
      if (batch.some((i) => !i)) {
        metrics.inputRejects++;
        return;
      }
      const actions = {
        fire: false,
        dash: false,
        shield: false,
        special: false,
      };
      let latest: ReturnType<typeof cleanInput>;
      for (const input of batch
        .filter(Boolean)
        .sort((a, b) => (a!.sequence ?? 0) - (b!.sequence ?? 0))) {
        if (!validSequence(input!.sequence, p.lastSequence ?? -1)) continue;
        if (input!.sequence !== undefined) p.lastSequence = input!.sequence;
        for (const key of ["fire", "dash", "shield", "special"] as const)
          actions[key] ||= !!input![key];
        latest = input;
      }
      if (!latest) return;
      p.lastInput = Date.now();
      inputLatch.capture(p, actions);
      p.input = latest;
      p.shieldBackdate = Math.min(150, (p.rtt ?? 0) / 2);
    });
    on("disconnect", () => {
      clearInterval(probeTimer);
      if (!room || closing || s.data.superseded || owners.get(id) !== s.id)
        return;
      offlineSince.set(id, Date.now());
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
        if (
          owners.get(id) === s.id &&
          removeExpiredPlayer(r, id, disconnectedAt, sessions)
        ) {
          owners.delete(id);
          offlineSince.delete(id);
          emit(r);
        }
      }, 30000);
      cleanupTimers.add(timeout);
    });
  });
  let last = Date.now(),
    frames = 0;
  const loop = setInterval(() => {
    const started = performance.now();
    const now = Date.now(),
      dt = Math.min((now - last) / 1000, 0.06);
    last = now;
    frames++;
    for (const [code, r] of rooms) {
      try {
        updateMatchmaking(r, now);
        const held = r.players
          .filter((p) => !p.bot)
          .map((p) => ({ p, input: { ...p.input } }));
        for (const { p } of held) {
          const pending = inputLatch.consume(p);
          if (pending)
            for (const key of ["fire", "dash", "shield", "special"] as const)
              p.input[key] = !!p.input[key] || !!pending[key];
        }
        tick(r, now, dt);
        for (const { p, input } of held)
          if (!p.lastInput || now - p.lastInput <= 500)
            for (const key of ["fire", "dash", "shield", "special"] as const)
              p.input[key] = !!input[key];
        if (frames % 2 === 0) emit(r);
      } catch (error) {
        report(`room:${code}`, error);
      }
      if (
        r.players.every((p) => p.bot || !p.online) &&
        now - r.updated > 600000
      ) {
        rooms.delete(code);
        for (const p of r.players) {
          owners.delete(p.id);
          offlineSince.delete(p.id);
        }
        for (const [t, s] of sessions) if (s.code === code) sessions.delete(t);
      }
    }
    metrics.tickMs = performance.now() - started;
    metrics.maxTickMs = Math.max(metrics.maxTickMs, metrics.tickMs);
  }, 1000 / 30);
  if (options.serveClient !== false) {
    if (process.env.NODE_ENV === "production")
      app.use(
        express.static("dist", {
          setHeaders(res, path) {
            if (/[/\\]assets[/\\].+-[A-Za-z0-9_-]+\.(js|css)$/.test(path))
              res.setHeader(
                "Cache-Control",
                "public, max-age=31536000, immutable",
              );
            else res.setHeader("Cache-Control", "no-cache");
          },
        }),
      );
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
  const requested = Number(
    process.env.PORT ??
      (cliPortIndex >= 0 ? process.argv[cliPortIndex + 1] : 3000),
  );
  const port =
    options.port ??
    (Number.isInteger(requested) && requested >= 0 && requested <= 65535
      ? requested
      : 3000);
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
      faults.close();
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
  installProcessLogging();
  const game = await createGameServer();
  console.log(
    `Pixel Rift listening on ${game.url.replace("127.0.0.1", "localhost")}`,
  );
}
