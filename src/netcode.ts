import type { Snapshot } from "../server/game";
export class SnapshotBuffer {
  frames: Snapshot[] = [];
  interval = 1000 / 15;
  jitter = 0;
  lastArrival = 0;
  push(s: Snapshot, arrived = Date.now()) {
    const last = this.frames.at(-1);
    if (last && last.matchId !== s.matchId) this.frames = [];
    if (last && s.now < last.now) return;
    if (this.lastArrival && last) {
      const spacing = Math.max(1, s.now - last.now);
      this.interval += (spacing - this.interval) * 0.1;
      this.jitter +=
        (Math.abs(arrived - this.lastArrival - spacing) - this.jitter) * 0.1;
    }
    this.lastArrival = arrived;
    this.frames.push(s);
    this.frames = this.frames.slice(-12);
  }
  get delay() {
    return Math.max(100, Math.min(250, 2 * this.interval + 2 * this.jitter));
  }
  position(id: string, now: number) {
    const target = now - this.delay;
    const after = this.frames.find((s) => s.now >= target),
      before = [...this.frames].reverse().find((s) => s.now <= target);
    const a = before?.players.find((p) => p.id === id),
      b = after?.players.find((p) => p.id === id);
    if (!a || !b || a.hidden || b.hidden || a.respawn || b.respawn)
      return undefined;
    const t =
      after!.now === before!.now
        ? 0
        : Math.max(
            0,
            Math.min(1, (target - before!.now) / (after!.now - before!.now)),
          );
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
}
export type Region = { id: string; url: string };
/** Explicit opt-in only. No alternate origins are configured or contacted by default. */
export async function bestRegion(
  regions: readonly Region[],
  probe: (url: string) => Promise<number>,
) {
  const results = await Promise.all(
    regions.map(async (r) => {
      try {
        return { ...r, rtt: await probe(r.url + "/health") };
      } catch {
        return { ...r, rtt: Infinity };
      }
    }),
  );
  return results
    .filter((r) => Number.isFinite(r.rtt))
    .sort((a, b) => a.rtt - b.rtt)[0];
}
