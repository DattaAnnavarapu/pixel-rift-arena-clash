export type Settings = {
  volume: number;
  reducedMotion: boolean;
  particles: boolean;
  stickSize?: number;
  leftHanded?: boolean;
  aimSensitivity?: number;
  haptics?: boolean;
  shadows?: boolean;
  quality?: "high" | "low";
};
export const defaultSettings: Settings = {
  volume: 0.7,
  reducedMotion: false,
  particles: true,
};
export function parseSettings(raw: string | null): Settings {
  try {
    const p = JSON.parse(raw ?? "{}");
    return {
      volume:
        typeof p?.volume === "number" && Number.isFinite(p.volume)
          ? Math.max(0, Math.min(1, p.volume))
          : 0.7,
      ...(typeof p?.stickSize === "number" && Number.isFinite(p.stickSize)
        ? { stickSize: Math.max(88, Math.min(132, p.stickSize)) }
        : {}),
      ...(typeof p?.aimSensitivity === "number" &&
      Number.isFinite(p.aimSensitivity)
        ? { aimSensitivity: Math.max(0.5, Math.min(2, p.aimSensitivity)) }
        : {}),
      ...(typeof p?.leftHanded === "boolean"
        ? { leftHanded: p.leftHanded }
        : {}),
      ...(typeof p?.haptics === "boolean" ? { haptics: p.haptics } : {}),
      ...(typeof p?.shadows === "boolean" ? { shadows: p.shadows } : {}),
      ...(p?.quality === "low" || p?.quality === "high"
        ? { quality: p.quality }
        : {}),
      reducedMotion: p?.reducedMotion === true,
      particles: p?.particles !== false,
    };
  } catch {
    return { ...defaultSettings };
  }
}
function load() {
  try {
    return parseSettings(localStorage.getItem("rift-settings"));
  } catch {
    return { ...defaultSettings };
  }
}
export let settings = load();
export function saveSettings(next: Settings) {
  settings = parseSettings(JSON.stringify(next));
  try {
    localStorage.setItem("rift-settings", JSON.stringify(settings));
  } catch {}
  return settings;
}

export function haptic(duration = 12) {
  if (settings.haptics && typeof navigator !== "undefined" && navigator.vibrate)
    navigator.vibrate(Math.min(20, Math.max(0, duration)));
}
