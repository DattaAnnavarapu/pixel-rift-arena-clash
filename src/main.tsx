import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Phaser from "phaser";
import { io } from "socket.io-client";
import { walls, type Room } from "../server/game";
import "./style.css";
const socket = io({ transports: ["websocket", "polling"] });
let state: (Room & { now: number }) | null = null,
  me = "",
  offset = 0;
const input = { x: 0, y: 0, angle: 0, fire: false, dash: false, shield: false };
let audio: AudioContext | undefined;
let muted = false;
function beep(freq = 500) {
  if (muted) return;
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.025, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.1);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.1);
  } catch {}
}
class Arena extends Phaser.Scene {
  g!: Phaser.GameObjects.Graphics;
  labels: Phaser.GameObjects.Text[] = [];
  keys: any;
  positions = new Map<string, { x: number; y: number }>();
  create() {
    this.g = this.add.graphics();
    this.keys = this.input.keyboard?.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E",
    );
    this.input.keyboard?.addCapture(["SPACE", "UP", "DOWN", "LEFT", "RIGHT"]);
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch && state) {
        const self = state.players.find((p) => p.id === me);
        if (self) input.angle = Math.atan2(p.y - self.y, p.x - self.x);
      }
    });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch) input.fire = true;
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch) input.fire = false;
    });
  }
  update() {
    if (!state) return;
    const k = this.keys;
    if (k) {
      const x =
          Number(k.D.isDown || k.RIGHT.isDown) -
          Number(k.A.isDown || k.LEFT.isDown),
        y =
          Number(k.S.isDown || k.DOWN.isDown) -
          Number(k.W.isDown || k.UP.isDown);
      if (!touchMove) {
        input.x = x;
        input.y = y;
      }
      input.dash = k.SPACE.isDown || touchDash;
      input.shield = k.E.isDown || touchShield;
    }
    const g = this.g;
    g.clear();
    g.fillStyle(0x161b30);
    g.fillRect(0, 0, 960, 600);
    g.lineStyle(1, 0x252b43);
    for (let x = 0; x < 960; x += 32) g.lineBetween(x, 0, x, 600);
    for (let y = 0; y < 600; y += 32) g.lineBetween(0, y, 960, y);
    [0xff586e, 0x4db9ff].forEach((c, i) => {
      g.fillStyle(c, 0.12);
      g.fillRect(i ? 820 : 0, 180, 140, 240);
      g.lineStyle(2, c, 0.45);
      g.strokeRect(i ? 820 : 0, 180, 140, 240);
    });
    for (const w of walls) {
      g.fillStyle(0x090e20);
      g.fillRect(w.x, w.y + 8, w.w, w.h);
      g.fillStyle(0x3e4968);
      g.fillRect(w.x, w.y, w.w, w.h);
      g.fillStyle(0x647091);
      g.fillRect(w.x, w.y, w.w, 5);
    }
    for (const c of state.crystals) {
      g.fillStyle(0xb394ff, 0.12);
      g.fillCircle(c.x, c.y, 24);
      g.fillStyle(0xc8a1ff);
      g.fillTriangle(c.x, c.y - 12, c.x - 9, c.y, c.x + 9, c.y);
      g.fillTriangle(c.x, c.y + 12, c.x - 9, c.y, c.x + 9, c.y);
    }
    for (const b of state.bolts) {
      g.fillStyle(b.team ? 0x71d6ff : 0xff7d8d);
      g.fillRect(b.x - 4, b.y - 4, 8, 8);
    }
    this.labels.forEach((t) => t.destroy());
    this.labels = [];
    const now = Date.now() + offset;
    for (const p of state.players) {
      if (p.respawn || !p.online) continue;
      let pos = this.positions.get(p.id);
      if (!pos || Math.hypot(pos.x - p.x, pos.y - p.y) > 160)
        pos = { x: p.x, y: p.y };
      pos.x += (p.x - pos.x) * 0.4;
      pos.y += (p.y - pos.y) * 0.4;
      this.positions.set(p.id, pos);
      const { x, y } = pos,
        c = p.team ? 0x4db9ff : 0xff586e;
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(x, y + 16, 32, 12);
      g.fillStyle(c);
      g.fillRect(x - 12, y - 10, 24, 26);
      const step =
        Math.hypot(p.input.x, p.input.y) > 0 ? Math.sin(now / 85) * 3 : 0;
      g.fillStyle(0x262c48);
      g.fillRect(x - 10, y + 13 + step, 7, 7);
      g.fillRect(x + 3, y + 13 - step, 7, 7);
      g.fillStyle(0xffdbb0);
      g.fillRect(x - 8, y - 15, 16, 14);
      g.fillStyle(0x182139);
      g.fillRect(x - 5, y - 10, 3, 4);
      g.fillRect(x + 3, y - 10, 3, 4);
      g.fillStyle(0xe9efff);
      g.fillRect(
        x + Math.cos(p.input.angle) * 17 - 4,
        y + Math.sin(p.input.angle) * 17 - 4,
        8,
        8,
      );
      if (p.guard > now || p.immune > now) {
        g.lineStyle(2, p.guard > now ? 0xd4b5ff : 0xffffff, 0.8);
        g.strokeCircle(x, y, 23);
      }
      if (p.id === me) {
        g.lineStyle(2, 0xffffff, 0.6);
        g.strokeRect(x - 16, y - 21, 32, 44);
      }
      g.fillStyle(0x080e1b);
      g.fillRect(x - 18, y - 29, 36, 4);
      g.fillStyle(c);
      g.fillRect(x - 18, y - 29, (36 * p.hp) / 100, 4);
      this.labels.push(
        this.add
          .text(x, y - 47, p.name, {
            fontSize: "12px",
            color: "#e8eeff",
            fontFamily: "monospace",
          })
          .setOrigin(0.5),
      );
    }
  }
}
let touchMove = false,
  touchDash = false,
  touchShield = false;
function Stick({ aim = false }: { aim?: boolean }) {
  function move(e: React.PointerEvent) {
    const r = e.currentTarget.getBoundingClientRect(),
      x = (e.clientX - r.left - r.width / 2) / (r.width / 2),
      y = (e.clientY - r.top - r.height / 2) / (r.height / 2),
      n = Math.max(1, Math.hypot(x, y));
    if (aim) {
      input.angle = Math.atan2(y, x);
    } else {
      touchMove = true;
      input.x = x / n;
      input.y = y / n;
    }
    e.currentTarget.setAttribute(
      "style",
      `--sx:${(x / n) * 26}px;--sy:${(y / n) * 26}px`,
    );
  }
  return (
    <div
      className="stick"
      aria-label={aim ? "Aim joystick" : "Movement joystick"}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons) move(e);
      }}
      onPointerUp={(e) => {
        if (!aim) {
          touchMove = false;
          input.x = input.y = 0;
        }
        e.currentTarget.removeAttribute("style");
      }}
      onPointerCancel={() => {
        touchMove = false;
        input.x = input.y = 0;
      }}
    >
      <i />
      <span>{aim ? "AIM" : "MOVE"}</span>
    </div>
  );
}
function App() {
  const [s, setS] = useState<typeof state>(null),
    [id, setId] = useState(""),
    [name, setName] = useState(localStorage.getItem("rift-name") || ""),
    [code, setCode] = useState(
      new URLSearchParams(location.search).get("room") || "",
    ),
    [error, setError] = useState(""),
    [online, setOnline] = useState(false),
    [time, setTime] = useState(Date.now()),
    [sound, setSound] = useState(true);
  const mount = useRef<HTMLDivElement>(null);
  useEffect(() => {
    socket.on("connect", () => {
      setOnline(true);
      const token = sessionStorage.getItem("rift-token");
      if (token) enter(false, true);
    });
    socket.on("disconnect", () => {
      setOnline(false);
      input.fire = false;
      input.x = input.y = 0;
    });
    socket.on("state", (r) => {
      if (state && r.scores.join() !== state.scores.join()) beep(700);
      state = r;
      offset = r.now - Date.now();
      setS(r);
    });
    const timer = setInterval(() => {
      setTime(Date.now() + offset);
      if (me && socket.connected) socket.emit("input", input);
    }, 33);
    const blur = () => {
      input.x = input.y = 0;
      input.fire = input.dash = input.shield = false;
      touchMove = touchDash = touchShield = false;
    };
    window.addEventListener("blur", blur);
    return () => {
      clearInterval(timer);
      window.removeEventListener("blur", blur);
    };
  }, []);
  useEffect(() => {
    if (!s || !mount.current) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: mount.current,
      width: 960,
      height: 600,
      pixelArt: true,
      backgroundColor: "#161b30",
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: Arena,
    });
    return () => game.destroy(true);
  }, [!!s]);
  function enter(create: boolean, resume = false) {
    socket.emit(
      "enter",
      {
        name: resume ? localStorage.getItem("rift-name") : name,
        code,
        create,
        token: resume ? sessionStorage.getItem("rift-token") : undefined,
      },
      (r: any) => {
        if (r.error) {
          if (resume) sessionStorage.removeItem("rift-token");
          setError(r.error);
          return;
        }
        me = r.id;
        setId(r.id);
        sessionStorage.setItem("rift-token", r.token);
        localStorage.setItem(
          "rift-name",
          name || localStorage.getItem("rift-name") || "Rifter",
        );
        history.replaceState({}, "", `?room=${r.code}`);
        setError("");
      },
    );
  }
  const self = s?.players.find((p) => p.id === id),
    lobby = s && ["lobby", "finished"].includes(s.phase);
  return (
    <main>
      <header>
        <a href="/" className="brand">
          <b>✦</b> PIXEL RIFT<span>ARENA CLASH</span>
        </a>
        <div className="status">
          <i className={online ? "on" : ""} />
          {online ? "SERVER ONLINE" : "CONNECTING…"}
          <button
            onClick={() => {
              muted = sound;
              setSound(!sound);
            }}
          >
            {sound ? "♪ ON" : "♪ OFF"}
          </button>
        </div>
      </header>
      {!s ? (
        <section className="landing">
          <div className="eyebrow">2–4 PLAYERS · TEAM ARENA · NO LOGIN</div>
          <h1>
            Small pixels.
            <br />
            <em>Big rivalries.</em>
          </h1>
          <p>
            Grab your crew. Cross the rift.
            <br />
            Battle for crystals in a three-minute showdown.
          </p>
          <div className="join">
            <label>
              YOUR NICKNAME
              <input
                maxLength={18}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </label>
            <button
              className="primary"
              disabled={!online}
              onClick={() => enter(true)}
            >
              CREATE A ROOM ↗
            </button>
            <div className="divider">OR JOIN YOUR FRIENDS</div>
            <div className="joinrow">
              <input
                aria-label="Room code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
              />
              <button
                disabled={!online || code.length !== 6}
                onClick={() => enter(false)}
              >
                JOIN →
              </button>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </div>
          <div className="features">
            <span>◆ COLLECT +1</span>
            <span>⚡ KNOCKOUT +3</span>
            <span>⚑ FIRST TO 20</span>
          </div>
        </section>
      ) : (
        <>
          <div className="matchbar">
            <div>
              <small>ROOM CODE</small>
              <strong>{s.code}</strong>
              <button
                onClick={() =>
                  navigator.clipboard
                    .writeText(location.href)
                    .catch(() => setError("Copy the URL from your address bar"))
                }
              >
                COPY INVITE ↗
              </button>
            </div>
            <div className="score">
              <b className="red">{s.scores[0]}</b>
              <span>
                {s.phase === "overtime"
                  ? "SUDDEN DEATH"
                  : s.phase === "playing"
                    ? `${Math.floor(Math.max(0, s.end - time) / 60000)}:${String(Math.floor(Math.max(0, s.end - time) / 1000) % 60).padStart(2, "0")}`
                    : "TO 20"}
              </span>
              <b className="blue">{s.scores[1]}</b>
            </div>
          </div>
          <div className="arenaWrap">
            <div className="arena" ref={mount} />
            {lobby && (
              <div className="overlay">
                <div className="panel">
                  <div className="eyebrow">
                    {s.phase === "finished"
                      ? "MATCH COMPLETE"
                      : "ASSEMBLE YOUR SQUAD"}
                  </div>
                  <h2>
                    {s.phase === "finished"
                      ? s.winner === "Draw"
                        ? "A perfect tie."
                        : `${s.winner} wins!`
                      : "The rift is waiting."}
                  </h2>
                  <div className="teams">
                    {[0, 1].map((t) => (
                      <div key={t}>
                        <h3 className={t ? "blue" : "red"}>
                          {t ? "AZURE" : "CRIMSON"}
                        </h3>
                        {s.players
                          .filter((p) => p.team === t)
                          .map((p) => (
                            <p key={p.id}>
                              {p.name} {p.id === s.host ? "♛" : ""}
                              <small>
                                {!p.online
                                  ? "RECONNECTING"
                                  : p.ready
                                    ? "READY ✓"
                                    : "NOT READY"}
                              </small>
                            </p>
                          ))}
                        <button
                          disabled={self?.team === t}
                          onClick={() => socket.emit("lobby", { team: t })}
                        >
                          JOIN TEAM
                        </button>
                      </div>
                    ))}
                  </div>
                  {s.players.filter((p) => p.team === 0 && p.online).length !==
                    s.players.filter((p) => p.team === 1 && p.online)
                      .length && (
                    <small>Teams are unbalanced. 2 vs 1 is allowed.</small>
                  )}
                  <div className="actions">
                    <button
                      className="primary"
                      onClick={() => {
                        beep();
                        socket.emit("lobby", { ready: !self?.ready });
                      }}
                    >
                      {self?.ready ? "UNREADY" : "READY UP ✓"}
                    </button>
                    {s.host === id && (
                      <button
                        disabled={
                          s.players.filter((p) => p.online).length < 2 ||
                          !s.players
                            .filter((p) => p.online)
                            .every((p) => p.ready) ||
                          ![0, 1].every((t) =>
                            s.players.some((p) => p.online && p.team === t),
                          )
                        }
                        onClick={() => socket.emit("lobby", { start: true })}
                      >
                        START MATCH →
                      </button>
                    )}
                  </div>
                  <small>
                    {s.host !== id
                      ? "Host starts when both teams are ready."
                      : "At least one ready player on each team to start."}
                  </small>
                </div>
              </div>
            )}
            {!online && (
              <div className="connection">
                Connection lost. Rejoining automatically…
              </div>
            )}
            {self?.respawn && !lobby ? (
              <div className="respawn">
                BACK IN {Math.max(1, Math.ceil((self.respawn - time) / 1000))}
              </div>
            ) : null}
          </div>
          <div className="abilities">
            <span>
              HP <b>{self?.hp ?? 100}</b>
            </span>
            <span>
              DASH{" "}
              {self && self.dash > time
                ? `${Math.ceil((self.dash - time) / 1000)}s`
                : "READY"}{" "}
              <kbd>SPACE</kbd>
            </span>
            <span>
              SHIELD{" "}
              {self && self.shield > time
                ? `${Math.ceil((self.shield - time) / 1000)}s`
                : "READY"}{" "}
              <kbd>E</kbd>
            </span>
          </div>
          {!lobby && (
            <div className="touch">
              <Stick />
              <div className="touchright">
                <Stick aim />
                <div>
                  <button
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      input.fire = true;
                    }}
                    onPointerUp={() => (input.fire = false)}
                    onPointerCancel={() => (input.fire = false)}
                  >
                    FIRE
                  </button>
                  <button
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      touchDash = true;
                    }}
                    onPointerUp={() => (touchDash = false)}
                    onPointerCancel={() => (touchDash = false)}
                  >
                    DASH
                  </button>
                  <button
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      touchShield = true;
                    }}
                    onPointerUp={() => (touchShield = false)}
                    onPointerCancel={() => (touchShield = false)}
                  >
                    SHIELD
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <details className="rules">
        <summary>
          HOW TO PLAY <span>+</span>
        </summary>
        <p>
          Crimson vs Azure. Crystals earn 1 point; knockouts earn 3. First to 20
          wins, or lead after 3 minutes. A tie starts 30 seconds of sudden
          death: the next score wins. Still tied? A draw.
        </p>
        <p>
          WASD / arrows to move · Mouse to aim · Hold click to fire · Space to
          dash (5s cooldown) · E for a 1.5s shield (12s cooldown). Each bolt
          deals 20 of 100 HP. Respawn in 3 seconds with brief protection.
          Phones: use MOVE and AIM sticks plus FIRE, DASH and SHIELD. Landscape
          recommended.
        </p>
        <p>
          Create a room, copy the invite, and choose teams. Everyone marks
          ready; the host starts. Up to two players per team. A disconnected
          slot is reserved for 30 seconds. Rematch from the results screen.
        </p>
      </details>
      <footer>
        PIXEL RIFT <span>BUILT FOR FRIENDLY RIVALRIES</span>
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
