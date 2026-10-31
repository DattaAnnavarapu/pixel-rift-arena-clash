import { blocked, type ArenaId } from "./game.js";
export type Point = { x: number; y: number };
/** Four-neighbour A* uses exactly the player's shared wall clearance. */
export function findPath(
  from: Point,
  to: Point,
  arena: ArenaId,
  broken: readonly number[] = [],
) {
  const cell = 32,
    cols = 30,
    rows = 18,
    key = (x: number, y: number) => y * cols + x;
  const walk = (x: number, y: number) =>
    x >= 0 &&
    x < cols &&
    y >= 0 &&
    y < rows &&
    !blocked(x * cell + 16, y * cell + 16, 13, arena, broken);
  const nearest = (p: Point) => {
    let best = -1,
      d = Infinity;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        if (walk(x, y)) {
          const n = Math.hypot(x * cell + 16 - p.x, y * cell + 16 - p.y);
          if (n < d) {
            d = n;
            best = key(x, y);
          }
        }
    return best;
  };
  const start = nearest(from),
    goal = nearest(to);
  if (start < 0 || goal < 0) return [];
  const h = (k: number) =>
    Math.abs((k % cols) - (goal % cols)) +
    Math.abs(Math.floor(k / cols) - Math.floor(goal / cols));
  const open = [start],
    closed = new Set<number>(),
    cost = new Map([[start, 0]]),
    parent = new Map<number, number>();
  while (open.length) {
    open.sort((a, b) => cost.get(a)! + h(a) - (cost.get(b)! + h(b)));
    const k = open.shift()!;
    if (k === goal) {
      const path: Point[] = [];
      let n = k;
      while (n !== start) {
        path.unshift({
          x: (n % cols) * cell + 16,
          y: Math.floor(n / cols) * cell + 16,
        });
        n = parent.get(n)!;
      }
      return path;
    }
    if (closed.has(k)) continue;
    closed.add(k);
    const x = k % cols,
      y = Math.floor(k / cols);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        n = key(nx, ny);
      if (!walk(nx, ny) || closed.has(n)) continue;
      const next = cost.get(k)! + 1;
      if (next < (cost.get(n) ?? Infinity)) {
        cost.set(n, next);
        parent.set(n, k);
        open.push(n);
      }
    }
  }
  return [];
}
export function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
