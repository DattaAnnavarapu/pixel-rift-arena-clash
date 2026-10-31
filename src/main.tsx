import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Phaser from "phaser";
import { io } from "socket.io-client";
import { arenas, modes, type ArenaId, type ModeId } from "../server/game";
import Arena from "./arena";
import {
  state,
  me,
  offset,
  input,
  touch,
  identify,
  receive,
  resetInput,
  type Snapshot,
} from "./runtime";
import {
  unlock,
  sound,
  setEffects,
  setMusic,
  effectsEnabled,
  musicEnabled,
} from "./audio";
import "./style.css";
const socket = io({ autoConnect: false, transports: ["websocket", "polling"] });
function Stick({ aim = false }: { aim?: boolean }) {
  function release(e: React.PointerEvent) {
    if (!aim) {
      touch.move = false;
      input.x = input.y = 0;
    }
    e.currentTarget.removeAttribute("style");
  }
  function move(e: React.PointerEvent) {
    const r = e.currentTarget.getBoundingClientRect(),
      x = (e.clientX - r.left - r.width / 2) / (r.width / 2),
      y = (e.clientY - r.top - r.height / 2) / (r.height / 2),
      n = Math.max(1, Math.hypot(x, y));
    if (aim) input.angle = Math.atan2(y, x);
    else {
      touch.move = true;
      input.x = x / n;
      input.y = y / n;
    }
    e.currentTarget.setAttribute(
      "style",
      `--sx:${(x / n) * 24}px;--sy:${(y / n) * 24}px`,
    );
  }
  return (
    <div
      className="stick"
      aria-label={aim ? "Aim joystick" : "Movement joystick"}
      onPointerDown={(e) => {
        unlock();
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons) move(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <i />
      <span>{aim ? "AIM" : "MOVE"}</span>
    </div>
  );
}
function TouchButton({
  action,
  label,
}: {
  action: "fire" | "dash" | "shield" | "special";
  label: string;
}) {
  const down = (on: boolean) => {
    if (action === "fire") input.fire = on;
    else touch[action] = on;
  };
  return (
    <button
      className={`touch-${action}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        unlock();
        down(true);
      }}
      onPointerUp={() => down(false)}
      onPointerCancel={() => down(false)}
      onLostPointerCapture={() => down(false)}
    >
      {label}
    </button>
  );
}
function ArenaPreview({ arena = "astral" }: { arena?: ArenaId }) {
  const a = arenas[arena];
  return (
    <svg
      className="map-preview"
      viewBox="0 0 320 200"
      aria-label={`${a.name} arena preview`}
      role="img"
    >
      <defs>
        <pattern
          id={`tiles-${arena}`}
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <rect width="16" height="16" fill={`#${a.floor.toString(16)}`} />
          <path
            d="M16 0H0V16"
            fill="none"
            stroke={`#${a.tile.toString(16)}`}
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="320" height="200" fill={`url(#tiles-${arena})`} />
      <rect
        x="5"
        y="62"
        width="40"
        height="76"
        rx="3"
        fill="#ff648022"
        stroke="#ff648066"
      />
      <rect
        x="275"
        y="62"
        width="40"
        height="76"
        rx="3"
        fill="#60d5ff22"
        stroke="#60d5ff66"
      />
      <circle
        cx="160"
        cy="100"
        r="35"
        fill="none"
        stroke={`#${a.accent.toString(16)}`}
        strokeOpacity=".3"
      />
      {a.walls.map((w, i) => (
        <g key={i}>
          <rect
            x={w.x / 3 + 2}
            y={w.y / 3 + 3}
            width={w.w / 3}
            height={w.h / 3}
            fill="#0005"
          />
          <rect
            x={w.x / 3}
            y={w.y / 3}
            width={w.w / 3}
            height={w.h / 3}
            fill={`#${a.stone.toString(16)}`}
          />
          <rect
            x={w.x / 3}
            y={w.y / 3}
            width={w.w / 3}
            height="2"
            fill="#ffffff25"
          />
        </g>
      ))}
      <path d="m160 83 9 17-9 17-9-17Z" fill={`#${a.accent.toString(16)}`} />
      <g fill="#ff738c">
        <rect x="27" y="90" width="9" height="13" />
        <rect x="26" y="87" width="11" height="5" />
      </g>
      <g fill="#6dddff">
        <rect x="282" y="101" width="9" height="13" />
        <rect x="281" y="98" width="11" height="5" />
      </g>
    </svg>
  );
}
function App() {
  const [s, setS] = useState<Snapshot | null>(null),
    [id, setId] = useState(""),
    [name, setName] = useState(localStorage.getItem("rift-name") || ""),
    [code, setCode] = useState(
      new URLSearchParams(location.search).get("room") || "",
    ),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [online, setOnline] = useState(false),
    [pending, setPending] = useState(false),
    [time, setTime] = useState(Date.now()),
    [sfx, setSfx] = useState(effectsEnabled),
    [music, setMusicState] = useState(musicEnabled),
    [help, setHelp] = useState(false);
  const mount = useRef<HTMLDivElement>(null),
    nameRef = useRef(name);
  nameRef.current = name;
  function join(create: boolean, resume = false) {
    unlock();
    setPending(true);
    socket.timeout(8000).emit(
      "enter",
      {
        name: resume ? localStorage.getItem("rift-name") : nameRef.current,
        code: new URLSearchParams(location.search).get("room") || code,
        create,
        token: resume ? sessionStorage.getItem("rift-token") : undefined,
      },
      (err: any, r: any) => {
        setPending(false);
        if (err || r?.error) {
          if (resume) {
            sessionStorage.removeItem("rift-token");
            identify("");
            receive(null);
            setS(null);
            resetInput();
          }
          setError(
            err ? "Server is taking a moment. Please try again." : r.error,
          );
          return;
        }
        identify(r.id);
        setId(r.id);
        sessionStorage.setItem("rift-token", r.token);
        localStorage.setItem(
          "rift-name",
          nameRef.current || localStorage.getItem("rift-name") || "Rifter",
        );
        history.replaceState({}, "", `?room=${r.code}`);
        setError("");
      },
    );
  }
  useEffect(() => {
    const connected = () => {
      setOnline(true);
      if (sessionStorage.getItem("rift-token")) join(false, true);
    };
    const disconnected = () => {
      setOnline(false);
      resetInput();
    };
    const snapshot = (r: Snapshot) => {
      if (state?.phase !== "finished" && r.phase === "finished") sound("win");
      receive(r);
      setS(r);
    };
    socket.on("connect", connected);
    socket.on("disconnect", disconnected);
    socket.on("state", snapshot);
    socket.connect();
    const timer = setInterval(() => {
      setTime(Date.now() + offset);
      if (
        me &&
        socket.connected &&
        state &&
        ["playing", "overtime"].includes(state.phase)
      )
        socket.emit("input", input);
    }, 33);
    const blur = () => resetInput();
    window.addEventListener("blur", blur);
    const visibility = () => {
      if (document.hidden) resetInput();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      socket.off("connect", connected);
      socket.off("disconnect", disconnected);
      socket.off("state", snapshot);
      socket.disconnect();
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!s || ["lobby", "finished"].includes(s.phase) || !mount.current) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: mount.current,
      width: 960,
      height: 600,
      pixelArt: true,
      backgroundColor: "#151b30",
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: Arena,
    });
    return () => game.destroy(true);
  }, [!!s, s?.phase === "lobby" || s?.phase === "finished"]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 2500);
    return () => clearTimeout(t);
  }, [notice]);
  const self = s?.players.find((p) => p.id === id),
    lobby = !!s && ["lobby", "finished"].includes(s.phase),
    host = s?.host === id,
    arena = s?.arena ?? "astral",
    mode = s?.mode ?? "crystal",
    rule = modes[mode];
  const configure = (a: any) => {
    unlock();
    sound("ui");
    socket.emit("lobby", a);
  };
  const left = Math.max(0, (s?.end ?? 0) - time),
    timer = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}`;
  function leave() {
    sessionStorage.removeItem("rift-token");
    resetInput();
    location.href = location.pathname;
  }
  async function invite() {
    try {
      await navigator.clipboard.writeText(location.href);
      setNotice("Invite link copied. Send it to your squad.");
    } catch {
      setNotice(`Share this room code: ${s?.code}`);
    }
  }
  return (
    <main className={s && !lobby ? "in-match" : ""} onPointerDown={unlock}>
      <header>
        <a href="/" className="brand">
          <b>✦</b>
          <div>
            PIXEL RIFT<span>ARENA CLASH</span>
          </div>
        </a>
        <nav>
          <span className={`connection-dot ${online ? "online" : ""}`} />
          <small>{online ? "RIFT ONLINE" : "CONNECTING"}</small>
          <button
            aria-pressed={sfx}
            onClick={() => {
              setEffects(!sfx);
              setSfx(!sfx);
            }}
          >
            SFX {sfx ? "ON" : "OFF"}
          </button>
          <button
            aria-pressed={music}
            onClick={() => {
              setMusic(!music);
              setMusicState(!music);
            }}
          >
            MUSIC {music ? "ON" : "OFF"}
          </button>
          <button aria-label="How to play" onClick={() => setHelp(!help)}>
            ?
          </button>
        </nav>
      </header>
      {!s ? (
        <>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">THE RIFT IS OPEN · 2–4 PLAYERS</span>
              <h1>
                Small pixels.
                <br />
                <em>Big rivalries.</em>
              </h1>
              <p>
                One arena. Two teams. Your next <br className="desktop-break" />
                “one more round” starts here.
              </p>
              <div className="hero-tags">
                <span>NO LOGIN</span>
                <span>PHONE + DESKTOP</span>
                <span>3 MINUTE ROUNDS</span>
              </div>
              <div className="hero-map">
                <ArenaPreview />
                <span>◆ TEAM UP. POWER UP. TAKE THE RIFT.</span>
              </div>
            </div>
            <div className="join-card">
              <div className="card-top">
                <span className="eyebrow">YOUR NEXT MATCH</span>
                <span>01 / JOIN THE RIFT</span>
              </div>
              <h2>Bring your squad.</h2>
              <p>Create a private room code. Invite up to three friends.</p>
              <label>
                YOUR NICKNAME
                <input
                  maxLength={18}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What should we call you?"
                  autoComplete="nickname"
                />
              </label>
              <button
                className="primary large"
                disabled={!online || pending}
                onClick={() => join(true)}
              >
                {pending ? "OPENING THE RIFT…" : "CREATE ROOM"} <span>↗</span>
              </button>
              <div className="divider">ALREADY HAVE A CODE?</div>
              <div className="join-row">
                <input
                  aria-label="Room code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    history.replaceState({}, "", location.pathname);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && code.length === 6) join(false);
                  }}
                  placeholder="6-DIGIT CODE"
                />
                <button
                  disabled={!online || pending || code.length !== 6}
                  onClick={() => join(false)}
                >
                  JOIN →
                </button>
              </div>
              <small className="quiet">
                Room codes work across phones and laptops.
              </small>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
            </div>
          </section>
          <section className="mode-showcase">
            {(Object.keys(modes) as ModeId[]).map((m, i) => (
              <article key={m}>
                <span className="mode-number">0{i + 1}</span>
                <h3>{modes[m].name}</h3>
                <p>{modes[m].description}</p>
                <small>FIRST TO {modes[m].target}</small>
              </article>
            ))}
          </section>
        </>
      ) : (
        <>
          <div className="room-heading">
            <div>
              <span className="eyebrow">
                {lobby ? "SQUAD LOBBY" : arenas[arena].name.toUpperCase()}
              </span>
              <h2>
                {lobby
                  ? s.phase === "finished"
                    ? "Run it back."
                    : "Your squad. Your rules."
                  : rule.name}
              </h2>
            </div>
            <div className="room-share">
              <small>ROOM CODE</small>
              <strong>{s.code}</strong>
              <button onClick={invite}>COPY INVITE ↗</button>
              <button className="quiet-button" onClick={leave}>
                LEAVE
              </button>
            </div>
          </div>
          {lobby ? (
            <div className="lobby-grid">
              <section className="setup-card">
                <div className="card-top">
                  <span className="eyebrow">BATTLEGROUND</span>
                  <small>{host ? "HOST CONTROLS" : "CHOSEN BY HOST"}</small>
                </div>
                <ArenaPreview arena={arena} />
                <div className="arena-options">
                  {(Object.keys(arenas) as ArenaId[]).map((a) => (
                    <button
                      key={a}
                      disabled={!host}
                      className={arena === a ? "selected" : ""}
                      aria-pressed={arena === a}
                      onClick={() => configure({ arena: a })}
                    >
                      <i
                        style={{
                          background: `#${arenas[a].accent.toString(16)}`,
                        }}
                      />
                      {arenas[a].name}
                    </button>
                  ))}
                </div>
                <p className="quiet">{arenas[arena].tag}</p>
                <label>
                  GAME MODE
                  <select
                    disabled={!host}
                    value={mode}
                    onChange={(e) => configure({ mode: e.target.value })}
                  >
                    {(Object.keys(modes) as ModeId[]).map((m) => (
                      <option key={m} value={m}>
                        {modes[m].name}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  {rule.description} · First to {rule.target}.
                </p>
                <small className="quiet">
                  Changing arena or mode resets everyone's ready status.
                </small>
              </section>
              <section className="squad-card">
                {s.phase === "finished" && (
                  <div
                    className={`result-banner ${s.winner === "Crimson" ? "red" : "blue"}`}
                  >
                    <span>✦ MATCH COMPLETE</span>
                    <h2>
                      {s.winner === "Draw"
                        ? "A perfect tie."
                        : `${s.winner} takes the rift!`}
                    </h2>
                    <strong>
                      {s.scores[0]} — {s.scores[1]}
                    </strong>
                  </div>
                )}
                <div className="card-top">
                  <span className="eyebrow">PLAYERS</span>
                  <small>{s.players.length} / 4 CONNECTED SLOTS</small>
                </div>
                <div className="teams">
                  {[0, 1].map((t) => (
                    <div key={t} className={`team team-${t}`}>
                      <div className="team-title">
                        <h3>{t ? "AZURE" : "CRIMSON"}</h3>
                        <span>
                          {s.players.filter((p) => p.team === t).length}/2
                        </span>
                      </div>
                      {s.players
                        .filter((p) => p.team === t)
                        .map((p) => (
                          <div
                            className={`player-card ${p.ready ? "is-ready" : ""}`}
                            key={p.id}
                          >
                            <div className={`pixel-avatar avatar-${t}`} />
                            <div>
                              <b>
                                {p.name}
                                {p.id === id ? " (YOU)" : ""}{" "}
                                {p.id === s.host ? "♛" : ""}
                              </b>
                              <small>
                                {p.loadout === "mend" ? "✚ MEND" : "✦ NOVA"}
                                {s.phase === "finished"
                                  ? ` · ${p.kills} K / ${p.deaths} D`
                                  : ""}
                              </small>
                            </div>
                            <span className="ready-dot">
                              {!p.online ? "↻" : p.ready ? "✓" : "•"}
                            </span>
                          </div>
                        ))}
                      {Array.from(
                        {
                          length: Math.max(
                            0,
                            2 - s.players.filter((p) => p.team === t).length,
                          ),
                        },
                        (_, i) => (
                          <div key={i} className="empty-slot">
                            + Waiting for a friend
                          </div>
                        ),
                      )}
                      <button
                        disabled={
                          self?.team === t ||
                          s.players.filter((p) => p.team === t).length >= 2
                        }
                        onClick={() => configure({ team: t })}
                      >
                        {self?.team === t ? "YOUR TEAM" : "SWITCH TEAM"}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="loadout">
                  <label>
                    YOUR SPECIAL <kbd>Q</kbd>
                  </label>
                  <div>
                    <button
                      aria-pressed={self?.loadout === "nova"}
                      className={self?.loadout === "nova" ? "selected" : ""}
                      onClick={() => configure({ loadout: "nova" })}
                    >
                      <b>✦ NOVA</b>
                      <small>3-bolt spread · 8s cooldown</small>
                    </button>
                    <button
                      aria-pressed={self?.loadout === "mend"}
                      className={self?.loadout === "mend" ? "selected" : ""}
                      onClick={() => configure({ loadout: "mend" })}
                    >
                      <b>✚ MEND</b>
                      <small>Restore 30 HP · 15s cooldown</small>
                    </button>
                  </div>
                </div>
                <div className="lobby-footer">
                  <div>
                    <b>
                      {s.players.filter((p) => p.online && p.ready).length} /{" "}
                      {s.players.filter((p) => p.online).length} READY
                    </b>
                    <small>
                      {s.players.filter((p) => p.team === 0 && p.online)
                        .length !==
                      s.players.filter((p) => p.team === 1 && p.online).length
                        ? "Unbalanced teams · 2 vs 1 allowed."
                        : "Both teams need a ready player."}
                    </small>
                  </div>
                  <button
                    className={self?.ready ? "" : "primary"}
                    onClick={() => configure({ ready: !self?.ready })}
                  >
                    {self?.ready ? "UNREADY" : "READY UP ✓"}
                  </button>
                  {host && (
                    <button
                      className="start-button"
                      disabled={
                        s.players.filter((p) => p.online).length < 2 ||
                        !s.players
                          .filter((p) => p.online)
                          .every((p) => p.ready) ||
                        ![0, 1].every((t) =>
                          s.players.some((p) => p.online && p.team === t),
                        )
                      }
                      onClick={() => configure({ start: true })}
                    >
                      {s.phase === "finished" ? "REMATCH" : "START MATCH"} →
                    </button>
                  )}
                </div>
                {!host && (
                  <small className="quiet">
                    The host starts once everyone is ready.
                  </small>
                )}
              </section>
            </div>
          ) : (
            <div className="battle-hud">
              <div className="score-team red">
                <span>CRIMSON</span>
                <strong>{s.scores[0]}</strong>
              </div>
              <div className="score-clock">
                <b>{s.phase === "overtime" ? "SUDDEN DEATH" : timer}</b>
                <small>
                  {rule.description} · TO {rule.target}
                </small>
              </div>
              <div className="score-team blue">
                <strong>{s.scores[1]}</strong>
                <span>AZURE</span>
              </div>
            </div>
          )}
          <div className={`arenaWrap ${lobby ? "lobby-arena" : ""}`}>
            <div className="arena" ref={mount} />
            {!online && (
              <div className="connection">
                Connection lost. Rejoining automatically…
              </div>
            )}
            {self?.respawn && !lobby ? (
              <div className="respawn">
                <span>RIFT RECALL</span>
                <b>{Math.max(1, Math.ceil((self.respawn - time) / 1000))}</b>
                <small>Back in the fight in a moment.</small>
              </div>
            ) : null}
          </div>
          {!lobby && (
            <>
              <div className="abilities">
                <div className="health">
                  <small>VITALITY</small>
                  <b>
                    {self?.hp ?? 100}
                    <small> / 100</small>
                  </b>
                  <i>
                    <span style={{ width: `${self?.hp ?? 100}%` }} />
                  </i>
                </div>
                {[
                  { name: "DASH", key: "SPACE", at: self?.dash ?? 0, cd: 5000 },
                  {
                    name: "SHIELD",
                    key: "E",
                    at: self?.shield ?? 0,
                    cd: 12000,
                  },
                  {
                    name: self?.loadout === "mend" ? "MEND" : "NOVA",
                    key: "Q",
                    at: self?.special ?? 0,
                    cd: self?.loadout === "mend" ? 15000 : 8000,
                  },
                ].map((a) => (
                  <div
                    className={`ability ${a.at > time ? "cooling" : "available"}`}
                    key={a.name}
                  >
                    <kbd>{a.key}</kbd>
                    <span>
                      <b>{a.name}</b>
                      <small>
                        {a.at > time
                          ? `${Math.ceil((a.at - time) / 1000)}s`
                          : "READY"}
                      </small>
                    </span>
                    <i
                      style={{
                        width: `${100 - Math.max(0, (a.at - time) / a.cd) * 100}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
              {mode === "control" && (
                <div className="control-status">
                  {s.controlTeam === 0
                    ? "CRIMSON CONTROLS THE RIFT"
                    : s.controlTeam === 1
                      ? "AZURE CONTROLS THE RIFT"
                      : "CENTER OPEN OR CONTESTED · ENTER THE RING"}
                </div>
              )}
              <div className="touch">
                <Stick />
                <div className="touchright">
                  <Stick aim />
                  <div className="touch-buttons">
                    <TouchButton action="fire" label="FIRE" />
                    <TouchButton action="dash" label="DASH" />
                    <TouchButton action="shield" label="SHIELD" />
                    <TouchButton
                      action="special"
                      label={self?.loadout === "mend" ? "MEND" : "NOVA"}
                    />
                  </div>
                </div>
              </div>
              <div className="match-tip">
                WASD move · MOUSE aim · CLICK fire · SPACE dash · E shield · Q
                special
              </div>
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      <details
        className="rules"
        open={help}
        onToggle={(e) => setHelp(e.currentTarget.open)}
      >
        <summary>
          FIELD MANUAL <span>{help ? "−" : "+"}</span>
        </summary>
        <div className="manual-grid">
          <div>
            <h3>01 / Squad up</h3>
            <p>
              Create a room or join with its code. Pick a team and Nova or Mend.
              Everyone marks ready; the host launches. No accounts, no installs.
            </p>
          </div>
          <div>
            <h3>02 / Know your kit</h3>
            <p>
              Move with WASD/arrows, aim with mouse, hold click to fire. Space
              dashes (5s); E shields for 1.5s (12s). Q fires three 15-damage
              Nova bolts (8s) or heals 30 HP with Mend (15s). Basic bolts deal
              20 damage. No friendly fire.
            </p>
          </div>
          <div>
            <h3>03 / Take the rift</h3>
            <p>
              Crystal Clash: crystals +1, KOs +3, target 20. Knockout: KOs +3,
              target 15. Rift Control: hold center uncontested for +1 per
              second, target 40. Highest score at 3 minutes wins; ties get
              30-second sudden death. Still tied? Draw. Respawn in 3 seconds.
            </p>
          </div>
          <div>
            <h3>04 / Take it anywhere</h3>
            <p>
              On phones use MOVE and AIM sticks, then FIRE, DASH, SHIELD and
              your special. Landscape recommended. A lost connection reserves
              your slot for 30 seconds. Rooms reset when the server restarts.
            </p>
          </div>
        </div>
      </details>
      <footer>
        <span>
          ✦ PIXEL RIFT <em>ARENA CLASH</em>
        </span>
        <span>BUILT FOR FRIENDLY RIVALRIES</span>
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
