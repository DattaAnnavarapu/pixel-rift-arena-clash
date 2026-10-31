export type Settings = {
  volume: number;
  reducedMotion: boolean;
  particles: boolean;
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
