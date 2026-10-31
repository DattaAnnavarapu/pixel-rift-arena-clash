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
  const speed = now < p.burst ? 650 : now < (p.speedUntil ?? 0) ? 245 : 175;
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
