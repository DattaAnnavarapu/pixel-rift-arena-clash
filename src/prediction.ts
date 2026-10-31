import { moveSpeed } from "../server/combat";
import {
  blocked,
  movementVelocity,
  type ArenaId,
  type PlayerView,
  type Input,
} from "../server/game";
export function movePosition(
  pos: { x: number; y: number },
  x: number,
  y: number,
  speed: number,
  dt: number,
  arena: ArenaId,
  broken: readonly number[] = [],
) {
  const n = Math.max(1, Math.hypot(x, y));
  for (let i = 0; i < 4; i++) {
    const nx = pos.x + ((x / n) * speed * dt) / 4,
      ny = pos.y + ((y / n) * speed * dt) / 4;
    if (!blocked(nx, pos.y, 13, arena, broken)) pos.x = nx;
    if (!blocked(pos.x, ny, 13, arena, broken)) pos.y = ny;
  }
  return pos;
}
export function predictPosition(
  pos: { x: number; y: number },
  p: PlayerView,
  input: Input,
  now: number,
  dt: number,
  age: number,
  arena: ArenaId,
  broken: readonly number[] = [],
) {
  const speed = moveSpeed(p, now);
  const velocity = movementVelocity(
    { ...p, ...pos },
    input,
    now,
    Math.min(dt, 0.05),
    arena,
  );
  Object.assign(pos, { vx: velocity.x, vy: velocity.y });
  movePosition(
    pos,
    velocity.x,
    velocity.y,
    Math.hypot(velocity.x, velocity.y),
    Math.min(dt, 0.05),
    arena,
    broken,
  );
  const target = movePosition(
    { x: p.x, y: p.y },
    p.moveX,
    p.moveY,
    speed,
    Math.min(0.1, age),
    arena,
    broken,
  );
  const error = Math.hypot(pos.x - target.x, pos.y - target.y);
  if (error > 100) return target;
  const k = 1 - Math.exp(-dt / 0.15),
    x = pos.x + (target.x - pos.x) * k,
    y = pos.y + (target.y - pos.y) * k;
  if (!blocked(x, y, 13, arena, broken)) {
    pos.x = x;
    pos.y = y;
  }
  return pos;
}
export function boltPosition(
  b: { x: number; y: number; vx: number; vy: number; life: number },
  age: number,
  arena: ArenaId,
  broken: readonly number[] = [],
) {
  const t = Math.min(Math.max(0, age), 0.1, b.life);
  const pos = { x: b.x, y: b.y };
  for (let i = 0; i < 6; i++) {
    const x = pos.x + (b.vx * t) / 6,
      y = pos.y + (b.vy * t) / 6;
    if (blocked(x, y, 4, arena, broken)) break;
    pos.x = x;
    pos.y = y;
  }
  return pos;
}

export type SentInput = { sequence: number; at: number; input: Input };
export type PredictedPosition = {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
};
export function advancePosition(
  pos: PredictedPosition,
  p: PlayerView,
  input: Input,
  now: number,
  dt: number,
  arena: ArenaId,
  broken: readonly number[] = [],
) {
  const velocity = movementVelocity(
    { ...p, ...pos },
    input,
    now,
    Math.min(dt, 0.05),
    arena,
  );
  pos.vx = velocity.x;
  pos.vy = velocity.y;
  return movePosition(
    pos,
    velocity.x,
    velocity.y,
    Math.hypot(velocity.x, velocity.y),
    Math.min(dt, 0.05),
    arena,
    broken,
  );
}
/** Replay only movement newer than the server acknowledgement. Never predict damage or abilities. */
export function replayPosition(
  p: PlayerView,
  history: readonly SentInput[],
  localNow: number,
  serverNow: number,
  arena: ArenaId,
  broken: readonly number[] = [],
) {
  const pos: PredictedPosition = { x: p.x, y: p.y, vx: p.vx, vy: p.vy };
  const pending = history.filter(
    (c) => c.sequence > (p.lastSequence ?? -1) && c.at <= localNow,
  );
  const cutoff = localNow - 300;
  for (let i = 0; i < pending.length; i++) {
    let from = Math.max(cutoff, pending[i].at);
    const end = Math.min(localNow, pending[i + 1]?.at ?? localNow);
    while (from < end) {
      const dt = Math.min(1 / 30, (end - from) / 1000);
      advancePosition(
        pos,
        p,
        pending[i].input,
        serverNow - (localNow - from),
        dt,
        arena,
        broken,
      );
      from += dt * 1000;
    }
  }
  return pos;
}

/** Cosmetic only: no player collision, damage, score or pickup mutation. */
export function cosmeticBoltPosition(
  b: { x: number; y: number; vx: number; vy: number; life: number },
  age: number,
  arena: ArenaId,
  broken: readonly number[] = [],
) {
  const p = { x: b.x, y: b.y };
  const end = Math.min(Math.max(0, age), b.life, 0.8);
  for (let t = 0; t < end; t += 0.02)
    movePosition(
      p,
      b.vx,
      b.vy,
      Math.hypot(b.vx, b.vy),
      Math.min(0.02, end - t),
      arena,
      broken,
    );
  return p;
}
