export const W = 960,
  H = 600;
export type Wall = { x: number; y: number; w: number; h: number };
export const arenas = {
  astral: {
    name: "Astral Keep",
    tag: "Balanced lanes · violet stone",
    floor: 0x151b30,
    tile: 0x202940,
    stone: 0x455577,
    accent: 0xb899ff,
    walls: [
      { x: 230, y: 145, w: 95, h: 65 },
      { x: 635, y: 145, w: 95, h: 65 },
      { x: 230, y: 390, w: 95, h: 65 },
      { x: 635, y: 390, w: 95, h: 65 },
    ],
  },
  grove: {
    name: "Verdant Ruins",
    tag: "Open center · flanking paths",
    floor: 0x132b2b,
    tile: 0x1a3634,
    stone: 0x42685c,
    accent: 0x83ebbf,
    walls: [
      { x: 210, y: 100, w: 65, h: 145 },
      { x: 685, y: 355, w: 65, h: 145 },
      { x: 210, y: 355, w: 65, h: 145 },
      { x: 685, y: 100, w: 65, h: 145 },
      { x: 415, y: 80, w: 130, h: 45 },
      { x: 415, y: 475, w: 130, h: 45 },
    ],
  },
  ember: {
    name: "Ember Forge",
    tag: "Tight cover · crossfire corridors",
    floor: 0x2d2029,
    tile: 0x392936,
    stone: 0x735362,
    accent: 0xffb36b,
    walls: [
      { x: 250, y: 100, w: 130, h: 55 },
      { x: 580, y: 100, w: 130, h: 55 },
      { x: 250, y: 445, w: 130, h: 55 },
      { x: 580, y: 445, w: 130, h: 55 },
      { x: 260, y: 260, w: 65, h: 80 },
      { x: 635, y: 260, w: 65, h: 80 },
    ],
  },
} as const;
export type ArenaId = keyof typeof arenas;
export const modes = {
  crystal: {
    name: "Crystal Clash",
    target: 20,
    description: "Crystals +1 · knockouts +3",
  },
  knockout: {
    name: "Knockout",
    target: 15,
    description: "Knockouts +3 · no crystals",
  },
  control: {
    name: "Rift Control",
    target: 40,
    description: "Hold the center · +1 per second",
  },
} as const;
export type ModeId = keyof typeof modes;
export const walls: readonly Wall[] = arenas.astral.walls;
export type Input = {
  x: number;
  y: number;
  angle: number;
  fire: boolean;
  dash: boolean;
  shield: boolean;
  special?: boolean;
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
  special: number;
  loadout: "nova" | "mend";
  kills: number;
  deaths: number;
  collected: number;
  lastInput: number;
  input: Input;
};
export type Effect = {
  id: number;
  kind:
    | "shot"
    | "hit"
    | "ko"
    | "crystal"
    | "dash"
    | "shield"
    | "nova"
    | "mend"
    | "respawn";
  x: number;
  y: number;
  team: number;
  at: number;
  value?: number;
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
    damage?: number;
  }[];
  crystals: { x: number; y: number }[];
  nextCrystal: number;
  updated: number;
  arena?: ArenaId;
  mode?: ModeId;
  effects?: Effect[];
  eventId?: number;
  nextControl?: number;
  controlTeam?: number;
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
    special: 0,
    loadout: "nova",
    kills: 0,
    deaths: 0,
    collected: 0,
    lastInput: 0,
    input: {
      x: 0,
      y: 0,
      angle: team ? Math.PI : 0,
      fire: false,
      dash: false,
      shield: false,
      special: false,
    },
  };
}
export function blocked(
  x: number,
  y: number,
  r = 13,
  arena: ArenaId = "astral",
) {
  return (
    x < r ||
    y < r ||
    x > W - r ||
    y > H - r ||
    arenas[arena].walls.some(
      (a) =>
        x + r > a.x && x - r < a.x + a.w && y + r > a.y && y - r < a.y + a.h,
    )
  );
}
export function configure(
  r: Room,
  actor: string,
  config: { arena?: unknown; mode?: unknown },
) {
  if (actor !== r.host || !["lobby", "finished"].includes(r.phase))
    return false;
  let changed = false;
  if (
    typeof config.arena === "string" &&
    Object.hasOwn(arenas, config.arena) &&
    r.arena !== config.arena
  ) {
    r.arena = config.arena as ArenaId;
    changed = true;
  }
  if (
    typeof config.mode === "string" &&
    Object.hasOwn(modes, config.mode) &&
    r.mode !== config.mode
  ) {
    r.mode = config.mode as ModeId;
    changed = true;
  }
  if (changed) r.players.forEach((p) => (p.ready = false));
  return changed;
}
function effect(
  r: Room,
  kind: Effect["kind"],
  p: { x: number; y: number; team: number },
  at: number,
  value?: number,
) {
  r.effects ??= [];
  r.eventId = (r.eventId ?? 0) + 1;
  r.effects.push({
    id: r.eventId,
    kind,
    x: p.x,
    y: p.y,
    team: p.team,
    at,
    value,
  });
}
export function start(r: Room, now: number) {
  r.arena ??= "astral";
  r.mode ??= "crystal";
  r.phase = "playing";
  r.scores = [0, 0];
  r.end = now + 180000;
  r.winner = "";
  r.bolts = [];
  r.crystals = r.mode === "crystal" ? [{ x: 480, y: 300 }] : [];
  r.effects = [];
  r.nextCrystal = now + 3500;
  r.nextControl = now + 1000;
  r.controlTeam = -1;
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
      special: 0,
      kills: 0,
      deaths: 0,
      collected: 0,
      ready: false,
      input: {
        ...p.input,
        x: 0,
        y: 0,
        fire: false,
        dash: false,
        shield: false,
        special: false,
      },
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
function damage(
  r: Room,
  p: Player,
  amount: number,
  team: number,
  owner: string,
  now: number,
) {
  if (now < p.guard || now < p.immune) return;
  p.hp = Math.max(0, p.hp - amount);
  effect(r, "hit", p, now, amount);
  if (p.hp === 0) {
    p.respawn = now + 3000;
    p.deaths++;
    const killer = r.players.find((a) => a.id === owner);
    if (killer) killer.kills++;
    if (r.mode !== "control") r.scores[team] += 3;
    effect(r, "ko", p, now);
  }
}
export function tick(r: Room, now: number, dt: number) {
  if (!["playing", "overtime"].includes(r.phase)) return;
  dt = Math.max(0, Math.min(dt, 0.06));
  r.effects = (r.effects ?? []).filter((e) => now - e.at < 1200);
  const before = [...r.scores],
    arena = r.arena ?? "astral",
    mode = r.mode ?? "crystal";
  for (const p of r.players) {
    if (!p.online) continue;
    if (p.respawn) {
      if (now >= p.respawn) {
        p.respawn = 0;
        p.hp = 100;
        p.x = p.team ? 870 : 90;
        p.y =
          245 +
          (r.players
            .filter((a) => a.team === p.team)
            .findIndex((a) => a.id === p.id) %
            2) *
            110;
        p.immune = now + 1500;
        effect(r, "respawn", p, now);
      }
      continue;
    }
    const a = p.input;
    if (p.lastInput && now - p.lastInput > 500) {
      a.x = a.y = 0;
      a.fire = a.dash = a.shield = a.special = false;
    }
    const n = Math.max(1, Math.hypot(a.x, a.y));
    if (a.dash && now >= p.dash) {
      p.dash = now + 5000;
      p.immune = now + 180;
      p.burst = now + 180;
      effect(r, "dash", p, now);
    }
    if (a.shield && now >= p.shield) {
      p.shield = now + 12000;
      p.guard = now + 1500;
      effect(r, "shield", p, now);
    }
    const speed = now < p.burst ? 650 : 175;
    for (let i = 0; i < 4; i++) {
      const x = p.x + ((a.x / n) * speed * dt) / 4,
        y = p.y + ((a.y / n) * speed * dt) / 4;
      if (!blocked(x, p.y, 13, arena)) p.x = x;
      if (!blocked(p.x, y, 13, arena)) p.y = y;
    }
    const fire = (angle: number, damage = 20) =>
      r.bolts.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * 420,
        vy: Math.sin(angle) * 420,
        owner: p.id,
        team: p.team,
        life: 0.9,
        damage,
      });
    if (a.fire && now >= p.shot) {
      p.shot = now + 500;
      fire(a.angle);
      effect(r, "shot", p, now);
    }
    if (a.special && now >= p.special) {
      if (p.loadout === "mend") {
        if (p.hp < 100) {
          p.special = now + 15000;
          const amount = Math.min(30, 100 - p.hp);
          p.hp += amount;
          effect(r, "mend", p, now, amount);
        }
      } else {
        p.special = now + 8000;
        for (const spread of [-0.24, 0, 0.24]) fire(a.angle + spread, 15);
        effect(r, "nova", p, now);
      }
    }
    r.crystals = r.crystals.filter((c) => {
      if (Math.hypot(c.x - p.x, c.y - p.y) < 26) {
        r.scores[p.team]++;
        p.collected++;
        effect(r, "crystal", { ...c, team: p.team }, now);
        return false;
      }
      return true;
    });
  }
  r.bolts = r.bolts.filter((b) => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || blocked(b.x, b.y, 4, arena)) return false;
    for (const p of r.players) {
      if (
        p.team === b.team ||
        p.respawn ||
        !p.online ||
        Math.hypot(p.x - b.x, p.y - b.y) > 20
      )
        continue;
      damage(r, p, b.damage ?? 20, b.team, b.owner, now);
      return false;
    }
    return true;
  });
  if (mode === "crystal" && now >= r.nextCrystal) {
    r.nextCrystal = now + 3500;
    if (r.crystals.length < 5) {
      const c = { x: 420 + Math.random() * 120, y: 210 + Math.random() * 180 };
      if (!blocked(c.x, c.y, 20, arena)) r.crystals.push(c);
    }
  }
  if (mode === "control") {
    const present = [0, 1].map((t) =>
      r.players.some(
        (p) =>
          p.online &&
          !p.respawn &&
          p.team === t &&
          Math.hypot(p.x - 480, p.y - 300) < 88,
      ),
    );
    r.controlTeam = present[0] === present[1] ? -1 : present[0] ? 0 : 1;
    if (now >= (r.nextControl ?? now)) {
      r.nextControl = now + 1000;
      if (r.controlTeam >= 0) r.scores[r.controlTeam]++;
    }
  }
  // Simultaneous scores in overtime must produce a leader, rather than an arbitrary team winning.
  const changed = before.some((v, i) => v !== r.scores[i]);
  if (
    r.scores.some((s) => s >= modes[mode].target) ||
    (r.phase === "overtime" && changed && r.scores[0] !== r.scores[1])
  )
    finish(r);
  else if (now >= r.end) {
    if (r.phase === "playing" && r.scores[0] === r.scores[1]) {
      r.phase = "overtime";
      r.end = now + 30000;
    } else finish(r);
  }
}
