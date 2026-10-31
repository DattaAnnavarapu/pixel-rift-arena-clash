// Original synthesized chiptune; no downloads or copyrighted recordings.
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
  g.gain.setValueAtTime(volume, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  o.connect(g);
  g.connect(context.destination);
  o.start(at);
  o.stop(at + duration);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}
export function unlock() {
  try {
    context ??= new AudioContext();
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
    440, 392, 329.63, 293.66, 196,
  ];
  musicTimer = setInterval(() => {
    if (document.hidden) return;
    tone(notes[step % notes.length], 0.2, 0.012, "triangle");
    if (step % 4 === 0)
      tone(notes[(step + 8) % notes.length] / 2, 0.35, 0.018, "sine");
    step++;
  }, 230);
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
export function sound(kind: string) {
  if (!effectsEnabled || document.hidden) return;
  switch (kind) {
    case "shot":
      tone(650, 0.07, 0.012, "square", 160);
      break;
    case "hit":
      tone(130, 0.12, 0.035, "sawtooth", 45);
      break;
    case "ko":
      tone(180, 0.35, 0.035, "triangle", 35);
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
