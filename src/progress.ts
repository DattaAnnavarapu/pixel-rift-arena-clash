import type { Snapshot } from "../server/game";
export type Progress = {
  wins: number;
  kos: number;
  loadouts: Record<string, number>;
  seen: Record<string, { kos: number; won: boolean; played: boolean }>;
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
  next.seen[key] = entry;
  const keys = Object.keys(next.seen);
  for (const k of keys.slice(0, Math.max(0, keys.length - 24)))
    delete next.seen[k];
  return next;
}
export function favorite(p: Progress) {
  const entries = Object.entries(p.loadouts)
    .filter(
      ([name, value]) => ["nova", "mend", "blink"].includes(name) && value > 0,
    )
    .sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0].toUpperCase() ?? "—";
}
