import { classes, weapons, maxHealth } from "../server/combat";
import { CombatSelection } from "./ui/CombatSelection";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  arenas,
  modes,
  loadouts,
  type ArenaId,
  type ModeId,
  type LoadoutId,
} from "../server/game";
import {
  state,
  me,
  offset,
  input,
  touch,
  identify,
  receive,
  resetInput,
  pauseInput,
  queueAction,
  inputPacket,
  setRoundTrip,
  uiPaused,
  type Snapshot,
} from "./runtime";
import {
  unlock,
  sound,
  setEffects,
  setMusic,
  effectsEnabled,
  musicEnabled,
  updateMusic,
  setVolume,
} from "./audio";
import { readProgress, updateProgress, favorite } from "./progress";
import { PROTOCOL_VERSION, RELEASE_VERSION } from "../server/release";
import {
  settings as initialSettings,
  saveSettings,
  type Settings,
} from "./settings";
import { ReleasePanel } from "./ui/ReleasePanels";
import { joystickVector } from "./joystick";
import "./style.css";
const socket = io({
  autoConnect: false,
  transports: ["websocket", "polling"],
  tryAllTransports: true,
  reconnectionDelay: 500,
  reconnectionDelayMax: 4000,
});
function Stick({ aim = false }: { aim?: boolean }) {
  const activePointer = useRef<number | null>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cancel = () => {
      activePointer.current = null;
      stickRef.current?.removeAttribute("style");
      if (aim) touch.firing = false;
      else {
        touch.move = false;
        input.x = input.y = 0;
      }
    };
    const visibility = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancel();
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [aim]);
  function release(e: React.PointerEvent) {
    if (activePointer.current !== e.pointerId) return;
    activePointer.current = null;
    if (aim) touch.firing = false;
    if (!aim) {
      touch.move = false;
      input.x = input.y = 0;
    }
    e.currentTarget.removeAttribute("style");
  }
  function move(e: React.PointerEvent) {
    const r = e.currentTarget.getBoundingClientRect(),
      vector = joystickVector(
        e.clientX - r.left - r.width / 2,
        e.clientY - r.top - r.height / 2,
        r.width * 0.4,
      ),
      { x, y } = vector;
    if (aim) {
      touch.aim = true;
      if (vector.active) input.angle = Math.atan2(y, x);
      touch.firing = vector.active;
    } else {
      touch.move = true;
      input.x = x;
      input.y = y;
    }
    e.currentTarget.setAttribute("style", `--sx:${x * 30}px;--sy:${y * 30}px`);
  }
  return (
    <div
      ref={stickRef}
      className={`stick ${aim ? "aim-stick" : "move-stick"}`}
      role="group"
      aria-label={aim ? "Aim and fire joystick" : "Movement joystick"}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (uiPaused || activePointer.current !== null) return;
        activePointer.current = e.pointerId;
        e.preventDefault();
        unlock();
        touch.aim = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => {
        if (activePointer.current === e.pointerId) move(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <i />
      <span>{aim ? "AIM + FIRE" : "MOVE"}</span>
    </div>
  );
}
function TouchButton({
  action,
  label,
  remaining = 0,
}: {
  action: "fire" | "dash" | "shield" | "special";
  label: string;
  remaining?: number;
}) {
  const down = (on: boolean) => {
    if (action === "fire") input.fire = on;
    else touch[action] = on;
  };
  return (
    <button
      className={`touch-${action} ${remaining > 0 ? "cooling" : "available"}`}
      aria-label={`${label}${remaining > 0 ? `, ready in ${remaining} seconds` : ""}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        unlock();
        queueAction(action);
        down(true);
      }}
      onPointerUp={() => down(false)}
      onPointerCancel={() => down(false)}
      onLostPointerCapture={() => down(false)}
    >
      <b>{label}</b>
      <small>
        {remaining > 0 ? `${remaining}s` : action === "fire" ? "HOLD" : "READY"}
      </small>
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
      {a.hazards?.map((h, i) => (
        <rect
          key={`zone${i}`}
          x={h.x / 3}
          y={h.y / 3}
          width={h.w / 3}
          height={h.h / 3}
          fill={
            h.kind === "ice"
              ? "#a5eaff44"
              : h.kind === "bush"
                ? "#63ad6f66"
                : "#ff884455"
          }
        />
      ))}
      {a.pads?.map((p, i) => (
        <circle
          key={`pad${i}`}
          cx={p.x / 3}
          cy={p.y / 3}
          r="7"
          fill="none"
          stroke="#bca7ff"
        />
      ))}
      {a.pickups?.map((p, i) => (
        <rect
          key={`item${i}`}
          x={p.x / 3 - 2}
          y={p.y / 3 - 2}
          width="4"
          height="4"
          fill={
            p.kind === "health"
              ? "#8dffba"
              : p.kind === "speed"
                ? "#8ddeff"
                : "#ffd475"
          }
        />
      ))}
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
  const [engineLoading, setEngineLoading] = useState(false),
    [engineError, setEngineError] = useState("");
  const [serverId, setServerId] = useState("");
  const [panel, setPanel] = useState<"tutorial" | "settings" | null>(null),
    [settings, setSettings] = useState(initialSettings),
    [quickMode, setQuickMode] = useState<ModeId>("crystal"),
    [latency, setLatency] = useState<number | null>(null),
    [snapshotStale, setSnapshotStale] = useState(false),
    [mismatch, setMismatch] = useState(false),
    [previewArena, setPreviewArena] = useState<ArenaId>("astral");
  const lastSnapshot = useRef(Date.now()),
    sequence = useRef(0),
    panelOpen = useRef(false);
  panelOpen.current = !!panel;
  const [progress, setProgress] = useState(() =>
    readProgress(localStorage.getItem("rift-progress")),
  );
  const [scoreboard, setScoreboard] = useState(false);
  const mount = useRef<HTMLDivElement>(null),
    nameRef = useRef(name);
  nameRef.current = name;
  useEffect(() => {
    pauseInput(!!panel);
    return () => pauseInput(false);
  }, [panel]);
  function join(create: boolean, resume = false, matchmake = false) {
    unlock();
    setPending(true);
    socket.timeout(8000).emit(
      "enter",
      {
        name: resume ? localStorage.getItem("rift-name") : nameRef.current,
        code: new URLSearchParams(location.search).get("room") || code,
        create,
        matchmake,
        mode: quickMode,
        protocol: PROTOCOL_VERSION,
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
        sequence.current = 0;
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
    const hello = (r: { protocol: number; instance?: string }) => {
      setServerId(r.instance ?? "unknown");
      if (r.protocol !== PROTOCOL_VERSION) {
        setMismatch(true);
        resetInput();
      }
    };
    const serverClosing = (r: { message: string }) => {
      setNotice(r.message);
      resetInput();
    };
    const probe = (ack: () => void) => {
      if (typeof ack === "function") ack();
    };
    socket.on("probe", probe);
    socket.on("hello", hello);
    socket.on("server-closing", serverClosing);
    const disconnected = () => {
      setOnline(false);
      resetInput();
    };
    const snapshot = (r: Snapshot) => {
      lastSnapshot.current = Date.now();
      setSnapshotStale(false);
      if (state?.matchId !== r.matchId) setScoreboard(false);
      if (state?.phase !== "finished" && r.phase === "finished") sound("win");
      updateMusic(r);
      try {
        const next = updateProgress(
          readProgress(localStorage.getItem("rift-progress")),
          r,
          me,
        );
        const encoded = JSON.stringify(next);
        if (encoded !== localStorage.getItem("rift-progress")) {
          localStorage.setItem("rift-progress", encoded);
          setProgress(next);
        }
      } catch {}
      receive(r);
      setS(r);
    };
    socket.on("connect", connected);
    socket.on("disconnect", disconnected);
    socket.on("state", snapshot);
    socket.connect();
    let lastUiUpdate = 0;
    const timer = setInterval(() => {
      if (Date.now() - lastUiUpdate >= 100) {
        setTime(Date.now() + offset);
        lastUiUpdate = Date.now();
      }
      const stale =
        !!me &&
        !!state &&
        ["playing", "overtime"].includes(state.phase) &&
        Date.now() - lastSnapshot.current > 1500;
      setSnapshotStale(stale);
      if (stale || panelOpen.current) resetInput();
      if (
        me &&
        socket.connected &&
        socket.io.engine?.transport.writable &&
        state &&
        ["playing", "overtime"].includes(state.phase)
      )
        socket.volatile.emit("input", inputPacket(sequence.current++));
    }, 16);
    const ping = setInterval(() => {
      const sent = Date.now();
      if (socket.connected)
        socket.timeout(3000).emit("ping-check", (err: any) => {
          if (!err) {
            const ms = Date.now() - sent;
            setLatency(ms);
            setRoundTrip(ms);
          }
        });
    }, 2500);
    const blur = () => {
      resetInput();
      setScoreboard(false);
    };
    const tabDown = (e: KeyboardEvent) => {
      if (
        !panelOpen.current &&
        e.key === "Tab" &&
        state &&
        ["playing", "overtime"].includes(state.phase)
      ) {
        e.preventDefault();
        setScoreboard(true);
      }
    };
    const tabUp = (e: KeyboardEvent) => {
      if (e.key === "Tab") setScoreboard(false);
    };
    window.addEventListener("keydown", tabDown);
    window.addEventListener("keyup", tabUp);
    window.addEventListener("blur", blur);
    const visibility = () => {
      if (document.hidden) resetInput();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      clearInterval(ping);
      socket.off("probe", probe);
      socket.off("hello", hello);
      socket.off("server-closing", serverClosing);
      socket.off("connect", connected);
      socket.off("disconnect", disconnected);
      socket.off("state", snapshot);
      socket.disconnect();
      window.removeEventListener("blur", blur);
      window.removeEventListener("keydown", tabDown);
      window.removeEventListener("keyup", tabUp);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (s && ["lobby", "finished"].includes(s.phase))
      void Promise.all([import("phaser"), import("./arena")]).catch(() => {});
  }, [!!s]);
  useEffect(() => {
    if (!s || ["lobby", "finished"].includes(s.phase) || !mount.current) return;
    let disposed = false,
      game: import("phaser").Game | undefined,
      resizeObserver: ResizeObserver | undefined;
    setEngineLoading(true);
    setEngineError("");
    void Promise.all([import("phaser"), import("./arena")])
      .then(([{ default: Phaser }, { default: Arena }]) => {
        if (disposed) return;
        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: mount.current!,
          width: 960,
          height: 600,
          pixelArt: true,
          backgroundColor: "#151b30",
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          scene: Arena,
        });
        resizeObserver = new ResizeObserver(() => game?.scale.refresh());
        resizeObserver.observe(mount.current!);
        setEngineLoading(false);
      })
      .catch(() => {
        if (!disposed) {
          setEngineLoading(false);
          setEngineError("Game files could not load. Reload to retry.");
        }
      });
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      game?.destroy(true);
    };
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
    resetInput();
    socket.timeout(3000).emit("leave", () => {
      sessionStorage.removeItem("rift-token");
      identify("");
      receive(null);
      setS(null);
      setId("");
      setError("");
      setScoreboard(false);
      history.replaceState({}, "", location.pathname);
    });
  }
  const closePanel = React.useCallback(() => {
    setPanel(null);
    resetInput();
  }, []);
  function changeSettings(value: Settings) {
    const saved = saveSettings(value);
    setSettings({ ...saved });
    setVolume(saved.volume);
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
          <small>
            {online
              ? latency === null
                ? "RIFT ONLINE"
                : `${latency} MS`
              : "RECONNECTING"}
          </small>
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
          <button
            aria-label="Player settings"
            onClick={() => setPanel("settings")}
          >
            ⚙
          </button>
          <button
            aria-label="How to play"
            onClick={() => {
              resetInput();
              setPanel("tutorial");
            }}
          >
            ?
          </button>
        </nav>
      </header>
      {mismatch && (
        <div className="update-banner" role="alert">
          A new game version is available.{" "}
          <button onClick={() => location.reload()}>RELOAD GAME</button>
        </div>
      )}
      {panel && (
        <ReleasePanel
          kind={panel}
          settings={settings}
          onSettings={changeSettings}
          onClose={closePanel}
          audioControls={
            <div className="settings-audio">
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
            </div>
          }
        />
      )}
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
              <div className="saved-stats">
                <span>
                  <b>{progress.wins}</b> WINS
                </span>
                <span>
                  <b>{progress.kos}</b> KOs
                </span>
                <span>
                  <b>{favorite(progress)}</b> FAVORITE KIT
                </span>
              </div>
              <div className="hero-tags">
                <span>NO LOGIN</span>
                <span>PHONE + DESKTOP</span>
                <span>90s–3 MINUTE ROUNDS</span>
              </div>
              <div className="hero-map">
                <ArenaPreview arena={previewArena} />
                <div className="preview-tabs">
                  {(Object.keys(arenas) as ArenaId[]).map((a) => (
                    <button
                      key={a}
                      aria-pressed={previewArena === a}
                      onClick={() => setPreviewArena(a)}
                    >
                      {arenas[a].name}
                    </button>
                  ))}
                </div>
                <span>◆ TEAM UP. POWER UP. TAKE THE RIFT.</span>
              </div>
            </div>
            <div className="join-card">
              <div className="card-top">
                <span className="eyebrow">YOUR NEXT MATCH</span>
                <span>01 / JOIN THE RIFT</span>
              </div>
              <h2>Find your next rivalry.</h2>
              <p>Jump into a public match or invite your own squad.</p>
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
              <label className="quick-mode">
                QUICK PLAY MODE
                <select
                  value={quickMode}
                  onChange={(e) => setQuickMode(e.target.value as ModeId)}
                >
                  {(Object.keys(modes) as ModeId[]).map((m) => (
                    <option key={m} value={m}>
                      {modes[m].name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="primary large"
                disabled={!online || pending || mismatch}
                onClick={() => join(false, false, true)}
              >
                {pending ? "FINDING A RIFT…" : "QUICK PLAY"}
                <span>⚡</span>
              </button>
              <button
                className="large"
                disabled={!online || pending || mismatch}
                onClick={() => join(true)}
              >
                {pending ? "OPENING THE RIFT…" : "PRIVATE ROOM"} <span>↗</span>
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
                  disabled={!online || pending || mismatch || code.length !== 6}
                  onClick={() => join(false)}
                >
                  JOIN →
                </button>
              </div>
              <small className="quiet">
                Quick Play matches on this server by mode. For friends abroad,
                use the exact same invite link and mode.
              </small>
              <button
                className="learn-button"
                onClick={() => setPanel("tutorial")}
              >
                FIRST TIME? LEARN TO PLAY →
              </button>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
            </div>
          </section>
          <section className="mode-showcase release-modes">
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
          {!lobby && (
            <nav className="mobile-match-bar" aria-label="Match controls">
              <span>
                {rule.name}
                <small className="match-ping">
                  {latency === null ? "…" : `${latency}ms`}
                </small>
              </span>
              <button onClick={() => setScoreboard(!scoreboard)}>SCORES</button>
              <button onClick={() => setPanel("settings")}>SETTINGS</button>
              <button onClick={leave}>LEAVE</button>
            </nav>
          )}
          <p className="network-info" role="status">
            SERVER {serverId || "connecting"} ·{" "}
            {latency === null ? "Measuring ping…" : `${latency}ms round trip`} ·{" "}
            {latency !== null && latency > 180
              ? "High latency: hits and abilities wait for the server."
              : "Same URL and mode required for Quick Play."}
          </p>
          <div className="room-heading">
            <div>
              <span className="eyebrow">
                {lobby ? "SQUAD LOBBY" : arenas[arena].name.toUpperCase()}
              </span>
              <h2>
                {lobby
                  ? s.phase === "finished"
                    ? "Run it back."
                    : s.publicMatch
                      ? "Your next match is forming."
                      : "Your squad. Your rules."
                  : rule.name}
              </h2>
            </div>
            <div className="room-share">
              <small>{s.publicMatch ? "PUBLIC MATCH" : "PRIVATE ROOM"}</small>
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
                  <small>
                    {s.publicMatch
                      ? "QUICK PLAY RULES"
                      : host
                        ? "HOST CONTROLS"
                        : "CHOSEN BY HOST"}
                  </small>
                </div>
                <ArenaPreview arena={arena} />
                <div className="arena-options">
                  {(Object.keys(arenas) as ArenaId[]).map((a) => (
                    <button
                      key={a}
                      disabled={!host || !!s.publicMatch}
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
                    disabled={!host || !!s.publicMatch}
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
                  {s.publicMatch
                    ? "Quick Play rules are locked; teams balance automatically."
                    : "Changing arena or mode resets everyone's ready status."}
                </small>
              </section>
              <section className="squad-card">
                {s.phase === "finished" && (
                  <div
                    className={`result-banner ${s.winner === "Crimson" ? "red" : "blue"}`}
                  >
                    <span>
                      ✦ MATCH COMPLETE{" "}
                      {s.finishReason === "forfeit" ? " · FORFEIT" : ""}
                    </span>
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
                {host && !s.publicMatch && (
                  <div className="bot-controls">
                    <button
                      onClick={() => configure({ bots: true })}
                      disabled={s.players.length >= 4}
                    >
                      FILL WITH BOTS
                    </button>
                    <button
                      onClick={() => configure({ bots: false })}
                      disabled={!s.players.some((p) => p.bot)}
                    >
                      REMOVE BOTS
                    </button>
                  </div>
                )}
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
                                {p.name} {p.bot ? "[BOT]" : ""}
                                {p.id === id ? " (YOU)" : ""}{" "}
                                {p.id === s.host ? "♛" : ""}
                              </b>
                              <small>
                                {`${classes[p.classId].name} · ${weapons[p.weaponId].name} · ${loadouts[p.loadout].name}`}
                                {p.rtt !== undefined
                                  ? ` · ${p.rtt}ms${p.rtt > 250 ? " HIGH PING" : ""}`
                                  : ""}
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
                          !!s.publicMatch ||
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
                <CombatSelection
                  classId={self?.classId ?? "assault"}
                  weaponId={self?.weaponId ?? "blaster"}
                  onSelect={configure}
                />
                <div className="loadout">
                  <label>
                    YOUR SPECIAL <kbd>Q</kbd>
                  </label>
                  <div>
                    {(Object.keys(loadouts) as LoadoutId[]).map((k) => (
                      <button
                        key={k}
                        aria-pressed={self?.loadout === k}
                        className={self?.loadout === k ? "selected" : ""}
                        onClick={() => configure({ loadout: k })}
                      >
                        <b>
                          {loadouts[k].glyph} {loadouts[k].name}
                        </b>
                        <small>{loadouts[k].description}</small>
                      </button>
                    ))}
                  </div>
                </div>
                {s.publicMatch && (
                  <div className="matchmaking-status" role="status">
                    {s.startsAt
                      ? `MATCH STARTS IN ${Math.max(1, Math.ceil((s.startsAt - time) / 1000))}`
                      : "QUICK PLAY · Waiting for two humans, with everyone ready."}
                  </div>
                )}
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
                    {s.publicMatch
                      ? "Your match starts automatically once everyone is ready."
                      : "The host starts once everyone is ready."}
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
            {!lobby && engineLoading && (
              <div className="engine-loading" role="status">
                <span className="rift-spinner">✦</span> OPENING THE ARENA…
              </div>
            )}
            {!lobby && engineError && (
              <div className="engine-loading" role="alert">
                {engineError}
                <button onClick={() => location.reload()}>RELOAD</button>
              </div>
            )}
            {!lobby && (
              <>
                <div className="kill-feed">
                  {s.feed?.map((f) => (
                    <div key={f.id} className={f.team === 0 ? "red" : "blue"}>
                      {f.killer} ▸ {f.victim}
                    </div>
                  ))}
                </div>
                <button
                  className="scores-toggle"
                  onClick={() => setScoreboard(!scoreboard)}
                >
                  SCORES · TAB
                </button>
                {scoreboard && (
                  <div className="scoreboard">
                    <h3>MATCH SCOREBOARD</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>PLAYER</th>
                          <th>KOs</th>
                          <th>DEATHS</th>
                          <th>CRYSTALS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.players.map((p) => (
                          <tr key={p.id} className={p.team ? "blue" : "red"}>
                            <td>
                              {p.name}
                              <small className="score-kit">
                                {classes[p.classId].name} ·{" "}
                                {weapons[p.weaponId].name}
                              </small>
                            </td>
                            <td>{p.kills}</td>
                            <td>{p.deaths}</td>
                            <td>{p.collected}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {(!online || snapshotStale) && (
              <div className="connection">
                {!online
                  ? "Connection lost. Rejoining automatically…"
                  : "Waiting for server updates. Controls paused until snapshots return."}
              </div>
            )}
            {self?.respawn && !lobby ? (
              <div className="respawn">
                <span>RIFT RECALL</span>
                <small>
                  {(() => {
                    const ally = s.players
                      .filter(
                        (p) => p.team === self.team && p.online && !p.respawn,
                      )
                      .sort(
                        (a, b) =>
                          Math.hypot(a.x - self.x, a.y - self.y) -
                          Math.hypot(b.x - self.x, b.y - self.y),
                      )[0];
                    return ally
                      ? `SPECTATING ${ally.name}`
                      : "Waiting for a teammate";
                  })()}
                </small>
                <b>{Math.max(1, Math.ceil((self.respawn - time) / 1000))}</b>
                <small>Back in the fight in a moment.</small>
              </div>
            ) : null}
          </div>
          {!lobby && (
            <>
              <div className="boosts">
                {self && self.speedUntil! > time
                  ? `SPEED ${Math.ceil((self.speedUntil! - time) / 1000)}s · `
                  : ""}
                {self && self.absorptionUntil > time && self.absorption > 0
                  ? `SHIELD ${self.absorption} · ${Math.ceil((self.absorptionUntil - time) / 1000)}s · `
                  : ""}
                {self && self.damageUntil! > time
                  ? `DOUBLE DAMAGE ${Math.ceil((self.damageUntil! - time) / 1000)}s`
                  : ""}
              </div>
              <div className="abilities">
                <div className="health">
                  <small>VITALITY</small>
                  <b>
                    {self?.hp ?? 100}
                    <small> / {maxHealth(self ?? {})}</small>
                  </b>
                  <i>
                    <span
                      style={{
                        width: `${((self?.hp ?? 100) / maxHealth(self ?? {})) * 100}%`,
                      }}
                    />
                  </i>
                  <div className="weapon-hud" aria-label="Weapon status">
                    <b>
                      {self?.weaponId === "rifle"
                        ? "RIFLE"
                        : weapons[
                            self?.weaponId ?? "blaster"
                          ].name.toUpperCase()}{" "}
                      {self?.ammo ?? 0}/
                      {weapons[self?.weaponId ?? "blaster"].magazine}
                    </b>
                    <small>
                      {self && self.reloadAt > time
                        ? `RELOAD ${((self.reloadAt - time) / 1000).toFixed(1)}s`
                        : self && self.shot > time
                          ? `FIRE ${((self.shot - time) / 1000).toFixed(1)}s`
                          : "READY · AUTO RELOAD"}
                    </small>
                  </div>
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
                    name: loadouts[self?.loadout ?? "nova"].name,
                    key: "Q",
                    at: self?.special ?? 0,
                    cd: loadouts[self?.loadout ?? "nova"].cooldown,
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
                    <TouchButton
                      action="dash"
                      label="DASH"
                      remaining={Math.max(
                        0,
                        Math.ceil(((self?.dash ?? 0) - time) / 1000),
                      )}
                    />
                    <TouchButton
                      action="shield"
                      label="SHIELD"
                      remaining={Math.max(
                        0,
                        Math.ceil(((self?.shield ?? 0) - time) / 1000),
                      )}
                    />
                    <TouchButton
                      action="special"
                      label={loadouts[self?.loadout ?? "nova"].name}
                      remaining={Math.max(
                        0,
                        Math.ceil(((self?.special ?? 0) - time) / 1000),
                      )}
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
              Create a room or join with its code. Pick a team and Nova, Mend or
              Blink. Everyone marks ready; the host launches. No accounts, no
              installs.
            </p>
          </div>
          <div>
            <h3>02 / Know your kit</h3>
            <p>
              Move with WASD/arrows, aim with mouse, hold click to fire. Space
              dashes (5s); E shields for 1.5s (12s). Q fires three 15-damage
              Nova bolts (8s), heals 30 HP with Mend (12s), or Blinks up to
              120px toward aim without crossing walls (10s). Shields reflect
              bolts. Blaster fires 20-damage bolts every 0.4s; shotgun fires
              five 8-damage pellets every 0.9s; rifle fires 50-damage bolts
              every 1s. Class modifiers apply. Weapons reload automatically.
              Pulse deals 20 damage in a 120px radius and pushes enemies (9s).
              Shields block Pulse. No friendly fire.
            </p>
          </div>
          <div>
            <h3>03 / Take the rift</h3>
            <p>
              Crystal Clash: crystals +1, KOs +3, target 20. Blitz: 90 seconds,
              crystals +2, target 30. Knockout: KOs +3, target 15. Rift Control:
              hold center uncontested for +1 per second, target 40. Highest
              score at 3 minutes wins; ties get 30-second sudden death with a
              shrinking boundary every 5s (25 damage/second outside). A team
              absent for 15 seconds forfeits. Still tied? Draw. Respawn in 3
              seconds.
            </p>
          </div>
          <div>
            <h3>04 / Take it anywhere</h3>
            <p>
              On phones use MOVE on the left and drag AIM + FIRE on the right.
              Release the right stick to stop firing; its center dead zone holds
              aim without shooting. Tap DASH, SHIELD or your special between the
              sticks. Landscape recommended. A lost connection reserves your
              slot for 30 seconds. Rooms reset when the server restarts.
            </p>
          </div>
        </div>
      </details>
      <footer>
        <span>
          ✦ PIXEL RIFT <em>ARENA CLASH</em>
        </span>
        <span>BUILT FOR FRIENDLY RIVALRIES · v{RELEASE_VERSION}</span>
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
