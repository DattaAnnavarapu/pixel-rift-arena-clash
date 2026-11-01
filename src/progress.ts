import { loadouts, type Snapshot } from "../server/game";
export type Progress = {
  xp?: number;
  matches?: number;
  wins: number;
  kos: number;
  loadouts: Record<string, number>;
  seen: Record<
    string,
    { kos: number; won: boolean; played: boolean; rewarded?: boolean }
  >;
};
export function emptyProgress(): Progress {
  return {
    wins: 0,
    kos: 0,
    loadouts: { nova: 0, mend: 0, blink: 0 },
    seen: {},
  };
}
export function readProgress(value: string | null): Progress {
  try {
    const p = JSON.parse(value ?? "null");
    if (
      !p ||
      !Number.isFinite(p.wins) ||
      !Number.isFinite(p.kos) ||
      typeof p.loadouts !== "object" ||
      !p.loadouts ||
      typeof p.seen !== "object" ||
      !p.seen
    )
      return emptyProgress();
    p.xp = Number.isSafeInteger(p.xp) && p.xp >= 0 ? p.xp : 0;
    p.matches =
      Number.isSafeInteger(p.matches) && p.matches >= 0 ? p.matches : 0;
    return p;
  } catch {
    return emptyProgress();
  }
}
export function updateProgress(
  old: Progress,
  s: Snapshot,
  id: string,
): Progress {
  const p = s.players.find((p) => p.id === id);
  if (
    s.tutorial ||
    !p ||
    p.bot ||
    !s.matchId ||
    !["playing", "overtime", "finished"].includes(s.phase)
  )
    return old;
  const next = structuredClone(old),
    key = `${s.matchId}:${id}`,
    entry = next.seen[key] ?? { kos: 0, won: false, played: false };
  next.kos += Math.max(0, p.kills - entry.kos);
  entry.kos = Math.max(entry.kos, p.kills);
  if (!entry.played) {
    entry.played = true;
    next.loadouts[p.loadout] = (next.loadouts[p.loadout] ?? 0) + 1;
  }
  if (
    s.phase === "finished" &&
    !entry.won &&
    s.winner === (p.team ? "Azure" : "Crimson")
  ) {
    entry.won = true;
    next.wins++;
  }
  if (
    s.phase === "finished" &&
    !entry.rewarded &&
    s.finishReason !== "forfeit"
  ) {
    entry.rewarded = true;
    next.matches = (next.matches ?? 0) + 1;
    next.xp =
      (next.xp ?? 0) +
      100 +
      (entry.won ? 50 : 0) +
      Math.min(100, p.kills * 5 + (p.objectives ?? 0) * 5);
  }
  next.seen[key] = entry;
  const keys = Object.keys(next.seen);
  for (const k of keys.slice(0, Math.max(0, keys.length - 24)))
    delete next.seen[k];
  return next;
}
export function favorite(p: Progress) {
  const entries = Object.entries(p.loadouts)
    .filter(([name, value]) => Object.hasOwn(loadouts, name) && value > 0)
    .sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0].toUpperCase() ?? "—";
}
