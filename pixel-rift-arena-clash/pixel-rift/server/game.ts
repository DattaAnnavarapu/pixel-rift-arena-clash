export const W = 960,
  H = 600;
export const walls = [
  { x: 230, y: 145, w: 95, h: 65 },
  { x: 635, y: 145, w: 95, h: 65 },
  { x: 230, y: 390, w: 95, h: 65 },
  { x: 635, y: 390, w: 95, h: 65 },
];
export type Input = {
  x: number;
  y: number;
  angle: number;
  fire: boolean;
  dash: boolean;
  shield: boolean;
};
export type Player = {
  id: string;
  name: string;
  team: number;
  x: number;
  y: number;
  hp: number;
  ready: boolean;
  online: boolean;
  respawn: number;
  immune: number;
  shot: number;
  dash: number;
  burst: number;
  shield: number;
  guard: number;
  input: Input;
};
export type Room = {
  code: string;
  host: string;
  players: Player[];
  phase: string;
  scores: number[];
  end: number;
  winner: string;
  bolts: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    owner: string;
    team: number;
    life: number;
  }[];
  crystals: { x: number; y: number }[];
  nextCrystal: number;
  updated: number;
};
export function player(id: string, name: string, team: number): Player {
  return {
    id,
    name,
    team,
    x: team ? 870 : 90,
    y: 300,
    hp: 100,
    ready: false,
    online: true,
    respawn: 0,
    immune: 0,
    shot: 0,
    dash: 0,
    burst: 0,
    shield: 0,
    guard: 0,
    input: {
      x: 0,
      y: 0,
      angle: team ? Math.PI : 0,
      fire: false,
      dash: false,
      shield: false,
    },
  };
}
export function blocked(x: number, y: number, r = 13) {
  return (
    x < r ||
    y < r ||
    x > W - r ||
    y > H - r ||
    walls.some(
      (a) =>
        x + r > a.x && x - r < a.x + a.w && y + r > a.y && y - r < a.y + a.h,
    )
  );
}
export function start(r: Room, now: number) {
  r.phase = "playing";
  r.scores = [0, 0];
  r.end = now + 180000;
  r.winner = "";
  r.bolts = [];
  r.crystals = [{ x: 480, y: 300 }];
  r.nextCrystal = now + 3500;
  r.players.forEach((p, i) =>
    Object.assign(p, {
      x: p.team ? 870 : 90,
      y:
        245 +
        (r.players.slice(0, i).filter((a) => a.team === p.team).length % 2) *
          110,
      hp: 100,
      respawn: 0,
      immune: now + 1500,
      shot: 0,
      dash: 0,
      burst: 0,
      shield: 0,
      guard: 0,
      ready: false,
    }),
  );
}
function finish(r: Room) {
  r.phase = "finished";
  r.winner =
    r.scores[0] === r.scores[1]
      ? "Draw"
      : r.scores[0] > r.scores[1]
        ? "Crimson"
        : "Azure";
  r.players.forEach((p) => (p.ready = false));
}
export function tick(r: Room, now: number, dt: number) {
  if (!["playing", "overtime"].includes(r.phase)) return;
  const before = r.scores.join();
  for (const p of r.players) {
    if (!p.online) continue;
    if (p.respawn) {
      if (now >= p.respawn) {
        p.respawn = 0;
        p.hp = 100;
        p.x = p.team ? 870 : 90;
        p.y = 300;
        p.immune = now + 1500;
      }
      continue;
    }
    const a = p.input;
    const n = Math.max(1, Math.hypot(a.x, a.y));
    let speed = 175;
    if (a.dash && now >= p.dash) {
      p.dash = now + 5000;
      p.immune = now + 180;
      p.burst = now + 180;
    }
    if (now < p.burst) speed = 650;
    if (a.shield && now >= p.shield) {
      p.shield = now + 12000;
      p.guard = now + 1500;
    }
    for (let i = 0; i < 4; i++) {
      let x = p.x + ((a.x / n) * speed * dt) / 4,
        y = p.y + ((a.y / n) * speed * dt) / 4;
      if (!blocked(x, p.y)) p.x = x;
      if (!blocked(p.x, y)) p.y = y;
    }
    if (a.fire && now >= p.shot) {
      p.shot = now + 500;
      r.bolts.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(a.angle) * 420,
        vy: Math.sin(a.angle) * 420,
        owner: p.id,
        team: p.team,
        life: 0.9,
      });
    }
    r.crystals = r.crystals.filter((c) => {
      if (Math.hypot(c.x - p.x, c.y - p.y) < 26) {
        r.scores[p.team]++;
        return false;
      }
      return true;
    });
  }
  r.bolts = r.bolts.filter((b) => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || blocked(b.x, b.y, 4)) return false;
    for (const p of r.players) {
      if (
        p.team === b.team ||
        p.respawn ||
        !p.online ||
        Math.hypot(p.x - b.x, p.y - b.y) > 20
      )
        continue;
      if (now >= p.guard && now >= p.immune) {
        p.hp -= 20;
        if (p.hp <= 0) {
          p.respawn = now + 3000;
          r.scores[b.team] += 3;
        }
      }
      return false;
    }
    return true;
  });
  if (now >= r.nextCrystal) {
    r.nextCrystal = now + 3500;
    if (r.crystals.length < 5)
      r.crystals.push({
        x: 430 + Math.random() * 100,
        y: 220 + Math.random() * 160,
      });
  }
  if (
    r.scores.some((s) => s >= 20) ||
    (r.phase === "overtime" && before !== r.scores.join())
  )
    finish(r);
  else if (now >= r.end) {
    if (r.phase === "playing" && r.scores[0] === r.scores[1]) {
      r.phase = "overtime";
      r.end = now + 30000;
    } else finish(r);
  }
}
