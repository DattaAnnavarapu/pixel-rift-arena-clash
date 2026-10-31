export type FaultProfile = { latency: number; jitter: number; loss: number };
export function faultProfile(
  env: NodeJS.ProcessEnv = process.env,
): FaultProfile {
  const bounded = (s: string | undefined, max: number) =>
    Math.max(0, Math.min(max, Number(s) || 0));
  return env.NODE_ENV === "production"
    ? { latency: 0, jitter: 0, loss: 0 }
    : {
        latency: bounded(env.SIM_LATENCY_MS, 2000),
        jitter: bounded(env.SIM_JITTER_MS, 1000),
        loss: bounded(env.SIM_LOSS, 1),
      };
}
export class FaultLink {
  timers = new Set<ReturnType<typeof setTimeout>>();
  constructor(
    public profile = faultProfile(),
    private random = Math.random,
  ) {}
  send(fn: () => void, lossy = false) {
    if (lossy && this.random() < this.profile.loss) return;
    const delay = Math.max(
      0,
      this.profile.latency + (this.random() * 2 - 1) * this.profile.jitter,
    );
    if (!delay) {
      fn();
      return;
    }
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, delay);
    this.timers.add(t);
  }
  close() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }
}
