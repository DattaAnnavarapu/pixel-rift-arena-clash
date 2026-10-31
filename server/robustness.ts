import type { Input } from "./game.js";
export function record(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
export class RateLimit {
  private buckets = new Map<string, { tokens: number; at: number }>();
  allow(key: string, perSecond: number, capacity: number, now = Date.now()) {
    const b = this.buckets.get(key) ?? { tokens: capacity, at: now };
    b.tokens = Math.min(
      capacity,
      b.tokens + (Math.max(0, now - b.at) / 1000) * perSecond,
    );
    b.at = now;
    const ok = b.tokens >= 1;
    if (ok) b.tokens--;
    this.buckets.set(key, b);
    return ok;
  }
}
export function validEnter(a: unknown) {
  return (
    record(a) &&
    ["create", "matchmake"].every(
      (k) => a[k] === undefined || typeof a[k] === "boolean",
    ) &&
    (a.name === undefined ||
      (typeof a.name === "string" && a.name.length <= 80)) &&
    (a.code === undefined ||
      (typeof a.code === "string" && a.code.length <= 12)) &&
    (a.token === undefined ||
      (typeof a.token === "string" && a.token.length <= 96))
  );
}
export function cleanInput(a: unknown): Input | undefined {
  if (
    !record(a) ||
    ![a.x, a.y, a.angle].every(Number.isFinite) ||
    !["fire", "dash", "shield", "special"].every(
      (k) => a[k] === undefined || typeof a[k] === "boolean",
    )
  )
    return;
  return {
    x: Math.max(-1, Math.min(1, a.x)),
    y: Math.max(-1, Math.min(1, a.y)),
    angle: Math.atan2(Math.sin(a.angle), Math.cos(a.angle)),
    fire: a.fire === true,
    dash: a.dash === true,
    shield: a.shield === true,
    special: a.special === true,
    sequence: a.sequence,
  };
}
export function installProcessLogging(
  logger: (kind: string, error: unknown) => void = (kind, error) =>
    console.error(kind, error),
) {
  const exception = (e: unknown) => logger("uncaughtException", e),
    rejection = (e: unknown) => logger("unhandledRejection", e);
  process.on("uncaughtException", exception);
  process.on("unhandledRejection", rejection);
  return () => {
    process.off("uncaughtException", exception);
    process.off("unhandledRejection", rejection);
  };
}
