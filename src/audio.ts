import { settings } from "./settings";
import { modes, type Snapshot } from "../server/game";
// Original synthesized chiptune; no downloads or copyrighted recordings.
let urgent = false;
export function updateMusic(s: Snapshot) {
  const next =
    s.phase === "overtime" ||
    (["playing"].includes(s.phase) &&
      s.scores.some((n) => n >= modes[s.mode ?? "crystal"].target * 0.8));
  if (next !== urgent) {
    urgent = next;
    if (musicTimer) schedule();
  }
}
let master: GainNode | undefined;
let context: AudioContext | undefined,
  musicTimer: ReturnType<typeof setInterval> | undefined,
  step = 0;
export let effectsEnabled = localStorage.getItem("rift-sfx") !== "off";
export let musicEnabled = localStorage.getItem("rift-music") === "on";
function tone(
  freq: number,
  duration = 0.1,
  volume = 0.025,
  type: OscillatorType = "square",
  slide = 0,
) {
  if (!context || context.state !== "running") return;
  const at = context.currentTime,
    o = context.createOscillator(),
    g = context.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, at + duration);
  g.gain.setValueAtTime(Math.max(0.0001, volume), at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  o.connect(g);
  g.connect(master!);
  o.start(at);
  o.stop(at + duration);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}
export function setVolume(value: number) {
  if (master && context)
    master.gain.setTargetAtTime(
      Math.max(0, Math.min(1, value)),
      context.currentTime,
      0.05,
    );
}
export function unlock() {
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = settings.volume;
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 8;
      master.connect(compressor);
      compressor.connect(context.destination);
    }
    void context.resume();
    if (!musicTimer) schedule();
  } catch {}
}
function schedule() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = undefined;
  }
  if (!musicEnabled || !context) return;
  const notes = [
    261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66, 220, 261.63, 329.63,
    440, 392, 329.63, 293.66, 196, 349.23, 440, 523.25, 698.46, 659.25, 523.25,
    440, 392, 293.66, 349.23, 440, 587.33, 523.25, 440, 392, 261.63,
  ];
  musicTimer = setInterval(
    () => {
      if (document.hidden) return;
      tone(notes[step % notes.length], 0.2, 0.012, "triangle");
      if (step % 4 === 0)
        tone(notes[(step + 8) % notes.length] / 2, 0.35, 0.018, "sine");
      step++;
    },
    urgent ? 165 : 230,
  );
}
export function setEffects(on: boolean) {
  effectsEnabled = on;
  localStorage.setItem("rift-sfx", on ? "on" : "off");
  unlock();
}
export function setMusic(on: boolean) {
  musicEnabled = on;
  localStorage.setItem("rift-music", on ? "on" : "off");
  unlock();
  schedule();
}
export function sound(kind: string, distance = 0) {
  if (!effectsEnabled || document.hidden) return;
  switch (kind) {
    case "shot":
      tone(650, 0.07, 0.012, "square", 160);
      break;
    case "shotgun":
      tone(160, 0.15, 0.018, "sawtooth", 40);
      break;
    case "rifle":
      tone(1000, 0.11, 0.018, "square", 100);
      break;
    case "reload":
      tone(220, 0.08, 0.012 * Math.max(0, 1 - distance / 600), "triangle", 440);
      break;
    case "absorb":
      tone(700, 0.09, 0.015 * Math.max(0, 1 - distance / 800), "sine", 300);
      break;
    case "hit":
      tone(130, 0.12, 0.035 * Math.max(0, 1 - distance / 800), "sawtooth", 45);
      break;
    case "ko":
      tone(180, 0.35, 0.035 * Math.max(0, 1 - distance / 800), "triangle", 35);
      break;
    case "crystal":
      tone(880, 0.13, 0.03);
      setTimeout(() => tone(1320, 0.16, 0.02), 70);
      break;
    case "mend":
      tone(330, 0.25, 0.03, "sine", 880);
      break;
    case "nova":
      tone(220, 0.22, 0.025, "sawtooth", 990);
      break;
    case "dash":
      tone(400, 0.12, 0.02, "triangle", 100);
      break;
    case "portal":
      tone(420, 0.3, 0.025, "sine", 1100);
      break;
    case "pickup":
      tone(660, 0.2, 0.025, "triangle", 1400);
      break;
    case "break":
      tone(100, 0.2, 0.03, "sawtooth", 30);
      break;
    case "pulse":
      tone(80, 0.3, 0.035, "sine", 300);
      break;
    case "reflect":
      tone(1000, 0.12, 0.025, "triangle", 1700);
      break;
    case "blink":
      tone(900, 0.18, 0.025, "sine", 100);
      break;
    case "shield":
      tone(520, 0.2, 0.025, "sine", 900);
      break;
    case "win":
      tone(523, 0.25, 0.03);
      setTimeout(() => tone(659, 0.25, 0.03), 130);
      setTimeout(() => tone(784, 0.4, 0.03), 260);
      break;
    default:
      tone(540, 0.08, 0.02);
  }
}

if (typeof document !== "undefined")
  document.addEventListener("visibilitychange", () => {
    if (context)
      void (document.hidden ? context.suspend() : context.resume()).catch(
        () => {},
      );
  });
