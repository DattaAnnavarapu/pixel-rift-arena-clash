import {
  weapons,
  pickups,
  PICKUP_RESPAWN,
  maxHealth,
  moveSpeed,
  outgoingDamage,
  type ClassId,
  type WeaponId,
  type PickupKind,
} from "./combat.js";
export { type PickupKind } from "./combat.js";
import { driveBots } from "./bots.js";
export const W = 960,
  H = 600;
export type Wall = {
  x: number;
  y: number;
  w: number;
  h: number;
  cracked?: boolean;
};
export type Zone = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "lava" | "vent" | "bush" | "ice";
  damage?: number;
};
export type ArenaData = {
  name: string;
  tag: string;
  floor: number;
  tile: number;
  stone: number;
  accent: number;
  walls: Wall[];
  hazards?: Zone[];
  pads?: { x: number; y: number; toX: number; toY: number }[];
  pickups?: { x: number; y: number; kind: PickupKind }[];
  spawns: { x: number; y: number }[];
};
export const arenas: Record<"astral" | "grove" | "ember" | "frost", ArenaData> =
  {
    astral: {
      spawns: [
        { x: 480, y: 300 },
        { x: 180, y: 90 },
        { x: 780, y: 510 },
        { x: 180, y: 510 },
        { x: 780, y: 90 },
        { x: 380, y: 265 },
        { x: 580, y: 335 },
      ],
      pads: [
        { x: 150, y: 300, toX: 810, toY: 300 },
        { x: 810, y: 300, toX: 150, toY: 300 },
      ],
      pickups: [
        { kind: "health", x: 480, y: 140 },
        { kind: "speed", x: 380, y: 300 },
        { kind: "speed", x: 580, y: 300 },
        { kind: "damage", x: 480, y: 460 },
      ],
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
      spawns: [
        { x: 480, y: 300 },
        { x: 140, y: 80 },
        { x: 820, y: 520 },
        { x: 140, y: 520 },
        { x: 820, y: 80 },
        { x: 340, y: 230 },
        { x: 620, y: 370 },
      ],
      hazards: [
        { kind: "bush", x: 340, y: 170, w: 80, h: 90 },
        { kind: "bush", x: 540, y: 340, w: 80, h: 90 },
      ],
      pickups: [
        { kind: "health", x: 480, y: 180 },
        { kind: "damage", x: 480, y: 420 },
        { kind: "speed", x: 330, y: 300 },
        { kind: "speed", x: 630, y: 300 },
      ],
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
      spawns: [
        { x: 480, y: 300 },
        { x: 160, y: 130 },
        { x: 800, y: 470 },
        { x: 160, y: 470 },
        { x: 800, y: 130 },
        { x: 400, y: 220 },
        { x: 560, y: 380 },
      ],
      hazards: [
        { kind: "lava", x: 370, y: 185, w: 220, h: 18, damage: 5 },
        { kind: "lava", x: 370, y: 397, w: 220, h: 18, damage: 5 },
        { kind: "vent", x: 420, y: 265, w: 40, h: 70, damage: 10 },
        { kind: "vent", x: 500, y: 265, w: 40, h: 70, damage: 10 },
      ],
      pickups: [
        { kind: "health", x: 480, y: 215 },
        { kind: "damage", x: 480, y: 385 },
        { kind: "speed", x: 350, y: 300 },
        { kind: "speed", x: 610, y: 300 },
      ],
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
    frost: {
      name: "Frost Bridge",
      tag: "Narrow lanes · slippery center",
      floor: 0x172b3c,
      tile: 0x254155,
      stone: 0x638da0,
      accent: 0xacf4ff,
      walls: [
        { x: 300, y: 80, w: 60, h: 170 },
        { x: 600, y: 350, w: 60, h: 170 },
        { x: 600, y: 80, w: 60, h: 170 },
        { x: 300, y: 350, w: 60, h: 170 },
      ],
      hazards: [{ kind: "ice", x: 370, y: 160, w: 220, h: 280 }],
      pickups: [
        { kind: "health", x: 480, y: 180 },
        { kind: "damage", x: 480, y: 420 },
        { kind: "speed", x: 240, y: 300 },
        { kind: "speed", x: 720, y: 300 },
      ],
      spawns: [
        { x: 480, y: 300 },
        { x: 180, y: 100 },
        { x: 780, y: 500 },
        { x: 180, y: 500 },
        { x: 780, y: 100 },
        { x: 400, y: 280 },
        { x: 560, y: 320 },
      ],
    },
  };
arenas.grove.walls = arenas.grove.walls.map((w, i) => ({
  ...w,
  cracked: i < 4,
}));
for (const arena of Object.values(arenas)) {
  arena.pickups ??= [];
  arena.pickups.push({ kind: "shield", x: 480, y: 300 });
}
export type ArenaId = keyof typeof arenas;
export const modes = {
  crystal: {
    duration: 180000,
    name: "Crystal Clash",
    target: 20,
    description: "Crystals +1 · knockouts +3",
  },
  knockout: {
    duration: 180000,
    name: "Knockout",
    target: 15,
    description: "Knockouts +3 · no crystals",
  },
  control: {
    duration: 180000,
    name: "Rift Control",
    target: 40,
    description: "Hold the center · +1 per second",
  },
  blitz: {
    name: "Blitz",
    duration: 90000,
    target: 30,
    description: "Crystals +2 · KOs +3 · 90 seconds",
  },
} as const;
export type ModeId = keyof typeof modes;
export const loadouts = {
  nova: {
    name: "NOVA",
    glyph: "✦",
    cooldown: 8000,
    description: "3-bolt spread · 8s cooldown",
  },
  mend: {
    name: "MEND",
    glyph: "✚",
    cooldown: 12000,
    description: "Restore 30 HP · 12s cooldown",
  },
  blink: {
    name: "BLINK",
    glyph: "◇",
    cooldown: 10000,
    description: "Teleport up to 120px · 10s cooldown",
  },
  pulse: {
    name: "PULSE",
    glyph: "◎",
    cooldown: 9000,
    description: "20 damage + knockback · 120px · 9s",
  },
} as const;
export type LoadoutId = keyof typeof loadouts;
export function usesCrystals(mode: ModeId) {
  return mode === "crystal" || mode === "blitz";
}
export const walls: readonly Wall[] = arenas.astral.walls;
export type Input = {
  x: number;
  y: number;
  angle: number;
  fire: boolean;
  dash: boolean;
  shield: boolean;
  special?: boolean;
  sequence?: number;
  shotId?: number;
  history?: Input[];
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
  dashX?: number;
  dashY?: number;
  shield: number;
  guard: number;
  special: number;
  loadout: LoadoutId;
  classId: ClassId;
  weaponId: WeaponId;
  ammo: number;
  reloadAt: number;
  absorption: number;
  absorptionUntil: number;
  lastSequence?: number;
  rtt?: number;
  lastShotId?: number;
  shieldBackdate?: number;
  guardStart?: number;
  bot?: boolean;
  stormTick?: number;
  portalUntil?: number;
  environmentTick?: number;
  speedUntil?: number;
  damageUntil?: number;
  vx?: number;
  vy?: number;
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
    | "respawn"
    | "reflect"
    | "blink"
    | "portal"
    | "pickup"
    | "break"
    | "pulse"
    | "absorb"
    | "reload";
  x: number;
  y: number;
  team: number;
  at: number;
  value?: number;
  weaponId?: WeaponId;
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
    weaponId?: WeaponId;
    shotId?: number;
    catchup?: number;
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
  emptySince?: (number | null)[];
  finishReason?: string;
  matchId?: string;
  publicMatch?: boolean;
  startsAt?: number;
  overtimeStart?: number;
  brokenWalls?: number[];
  wallHits?: Record<number, number>;
  spawnIndex?: number;
  pickups?: { x: number; y: number; kind: PickupKind; availableAt: number }[];
  feed?: {
    id: number;
    killer: string;
    victim: string;
    team: number;
    at: number;
  }[];
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
    classId: "assault",
    weaponId: "blaster",
    ammo: weapons.blaster.magazine,
    reloadAt: 0,
    absorption: 0,
    absorptionUntil: 0,
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
  broken: readonly number[] = [],
) {
  return (
    x < r ||
    y < r ||
    x > W - r ||
    y > H - r ||
    arenas[arena].walls.some(
      (a, i) =>
        !broken.includes(i) &&
        x + r > a.x &&
        x - r < a.x + a.w &&
        y + r > a.y &&
        y - r < a.y + a.h,
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
  if (changed) r.players.forEach((p) => (p.ready = !!p.bot));
  return changed;
}
function effect(
  r: Room,
  kind: Effect["kind"],
  p: { x: number; y: number; team: number; weaponId?: WeaponId },
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
    weaponId: kind === "shot" || kind === "reload" ? p.weaponId : undefined,
  });
}
export function start(r: Room, now: number) {
  r.arena ??= "astral";
  r.mode ??= "crystal";
  r.phase = "playing";
  r.matchId = `${r.code}-${now}`;
  r.scores = [0, 0];
  r.end = now + modes[r.mode].duration;
  r.winner = "";
  r.bolts = [];
  r.crystals = usesCrystals(r.mode) ? [{ x: 480, y: 300 }] : [];
  r.effects = [];
  r.brokenWalls = [];
  r.wallHits = {};
  r.spawnIndex = 0;
  r.pickups = (arenas[r.arena].pickups ?? []).map((p) => ({
    ...p,
    availableAt: 0,
  }));
  r.feed = [];
  r.nextCrystal = now + 3500;
  r.nextControl = now + 1000;
  r.controlTeam = -1;
  r.emptySince = [null, null];
  r.overtimeStart = undefined;
  r.finishReason = "";
  r.players.forEach((p, i) =>
    Object.assign(p, {
      x: p.team ? 870 : 90,
      y:
        245 +
        (r.players.slice(0, i).filter((a) => a.team === p.team).length % 2) *
          110,
      hp: maxHealth(p),
      ammo: weapons[p.weaponId].magazine,
      reloadAt: 0,
      absorption: 0,
      absorptionUntil: 0,
      respawn: 0,
      immune: now + 1500,
      shot: 0,
      lastShotId: undefined,
      guardStart: 0,
      dash: 0,
      burst: 0,
      shield: 0,
      guard: 0,
      special: 0,
      portalUntil: 0,
      environmentTick: 0,
      speedUntil: 0,
      damageUntil: 0,
      vx: 0,
      vy: 0,
      stormTick: 0,
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
  r.players.forEach((p) => (p.ready = !!p.bot));
}
function damage(
  r: Room,
  p: Player,
  amount: number,
  team: number,
  owner: string,
  now: number,
  rifle = false,
) {
  if (now < p.guard || now < p.immune) return;
  if (now < p.absorptionUntil && p.absorption > 0) {
    const absorbed = Math.min(amount, p.absorption);
    p.absorption -= absorbed;
    amount -= absorbed;
    effect(r, "absorb", p, now, absorbed);
  }
  if (rifle && p.hp === maxHealth(p) && amount >= p.hp) amount = p.hp - 1;
  if (amount <= 0) return;
  p.hp = Math.max(0, p.hp - amount);
  effect(r, "hit", p, now, amount);
  if (p.hp === 0) {
    p.respawn = now + 3000;
    p.deaths++;
    const killer = r.players.find((a) => a.id === owner);
    if (killer) killer.kills++;
    if (r.mode !== "control") r.scores[team] += 3;
    effect(r, "ko", p, now);
    r.feed ??= [];
    r.feed.push({
      id: r.eventId!,
      killer: killer?.name ?? "Arena",
      victim: p.name,
      team: killer?.team ?? -1,
      at: now,
    });
    r.feed = r.feed.slice(-5);
  }
}
export function tick(r: Room, now: number, dt: number) {
  if (!["playing", "overtime"].includes(r.phase)) return;
  r.emptySince ??= [null, null];
  for (const team of [0, 1]) {
    if (r.players.some((p) => p.online && p.team === team))
      r.emptySince[team] = null;
    else r.emptySince[team] ??= now;
  }
  const absent = [0, 1].filter(
    (t) => r.emptySince![t] !== null && now - r.emptySince![t]! >= 15000,
  );
  if (absent.length) {
    finish(r);
    r.finishReason = "forfeit";
    r.winner =
      absent.length === 2 ? "Draw" : absent[0] === 0 ? "Azure" : "Crimson";
    return;
  }
  driveBots(r, now);
  dt = Math.max(0, Math.min(dt, 0.06));
  r.feed = r.feed?.filter((f) => now - f.at < 6000);
  r.effects = (r.effects ?? []).filter((e) => now - e.at < 600);
  const before = [...r.scores],
    arena = r.arena ?? "astral",
    mode = r.mode ?? "crystal";
  for (const p of r.players) {
    if (!p.online) continue;
    if (p.respawn) {
      if (now >= p.respawn) {
        p.respawn = 0;
        p.hp = maxHealth(p);
        p.ammo = weapons[p.weaponId].magazine;
        p.reloadAt = 0;
        p.absorption = p.absorptionUntil = 0;
        p.x = p.team ? 870 : 90;
        p.y =
          245 +
          (r.players
            .filter((a) => a.team === p.team)
            .findIndex((a) => a.id === p.id) %
            2) *
            110;
        p.immune = now + 1500;
        p.vx = p.vy = 0;
        p.speedUntil = p.damageUntil = 0;
        effect(r, "respawn", p, now);
      }
      continue;
    }
    const a = p.input;
    const weapon = weapons[p.weaponId];
    if (p.reloadAt && now >= p.reloadAt) {
      p.ammo = weapon.magazine;
      p.reloadAt = 0;
    }
    if (now >= p.absorptionUntil) p.absorption = 0;
    if (p.lastInput && now - p.lastInput > 500) {
      a.x = a.y = 0;
      a.fire = a.dash = a.shield = a.special = false;
    }
    if (a.dash && now >= p.dash) {
      p.dash = now + 5000;
      p.immune = now + 180;
      p.burst = now + 180;
      const length = Math.hypot(a.x, a.y);
      p.dashX = length > 0 ? a.x / length : Math.cos(a.angle);
      p.dashY = length > 0 ? a.y / length : Math.sin(a.angle);
      effect(r, "dash", p, now);
    }
    if (a.shield && now >= p.shield) {
      p.shield = now + 12000;
      p.guard = now + 1500;
      p.guardStart = now - Math.min(150, p.shieldBackdate ?? 0);
      effect(r, "shield", p, now);
    }
    const motion = movementVelocity(p, a, now, dt, arena);
    for (let i = 0; i < 4; i++) {
      const x = p.x + (motion.x * dt) / 4,
        y = p.y + (motion.y * dt) / 4;
      if (!blocked(x, p.y, 13, arena, r.brokenWalls)) p.x = x;
      if (!blocked(p.x, y, 13, arena, r.brokenWalls)) p.y = y;
    }
    const fire = (
      angle: number,
      damage: number,
      speed = 420,
      life = 0.9,
      weaponId?: WeaponId,
    ) =>
      r.bolts.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        owner: p.id,
        team: p.team,
        life,
        damage: outgoingDamage(p, damage, now),
        weaponId,
        shotId: weaponId ? a.shotId : undefined,
        catchup: weaponId ? Math.min(0.2, (p.rtt ?? 0) / 2000) : undefined,
      });
    if (
      a.fire &&
      now >= p.shot &&
      !p.reloadAt &&
      p.ammo > 0 &&
      (a.shotId === undefined || a.shotId !== p.lastShotId)
    ) {
      p.lastShotId = a.shotId;
      p.shot = now + weapon.interval;
      p.ammo--;
      for (const spread of weapon.spread)
        fire(
          a.angle + spread,
          weapon.damage,
          weapon.speed,
          weapon.life,
          p.weaponId,
        );
      if (p.ammo === 0) {
        p.reloadAt = now + weapon.reload;
        effect(r, "reload", p, now);
      }
      effect(r, "shot", p, now);
    }
    if (a.special && now >= p.special) {
      if (p.loadout === "pulse") {
        p.special = now + loadouts.pulse.cooldown;
        for (const enemy of r.players) {
          if (
            !enemy.online ||
            enemy.respawn ||
            enemy.team === p.team ||
            now < enemy.guard ||
            now < enemy.immune ||
            Math.hypot(enemy.x - p.x, enemy.y - p.y) > 120
          )
            continue;
          const steps = Math.ceil(Math.hypot(enemy.x - p.x, enemy.y - p.y) / 8);
          if (
            Array.from({ length: steps }, (_, i) =>
              blocked(
                p.x + ((enemy.x - p.x) * (i + 1)) / (steps + 1),
                p.y + ((enemy.y - p.y) * (i + 1)) / (steps + 1),
                2,
                arena,
                r.brokenWalls,
              ),
            ).some(Boolean)
          )
            continue;
          damage(r, enemy, outgoingDamage(p, 20, now), p.team, p.id, now);
          const angle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
          if (!enemy.respawn)
            for (let i = 0; i < 18; i++) {
              const x = enemy.x + Math.cos(angle) * 4,
                y = enemy.y + Math.sin(angle) * 4;
              if (blocked(x, y, 13, arena, r.brokenWalls)) break;
              enemy.x = x;
              enemy.y = y;
            }
        }
        effect(r, "pulse", p, now);
      } else if (p.loadout === "blink") {
        p.special = now + 10000;
        for (let distance = 4; distance <= 120; distance += 4) {
          const x = p.x + Math.cos(a.angle) * 4,
            y = p.y + Math.sin(a.angle) * 4;
          if (blocked(x, y, 13, arena, r.brokenWalls)) break;
          p.x = x;
          p.y = y;
        }
        effect(r, "blink", p, now);
      } else if (p.loadout === "mend") {
        if (p.hp < maxHealth(p)) {
          p.special = now + 12000;
          const amount = Math.min(30, maxHealth(p) - p.hp);
          p.hp += amount;
          effect(r, "mend", p, now, amount);
        }
      } else {
        p.special = now + 8000;
        for (const spread of [-0.24, 0, 0.24]) fire(a.angle + spread, 15);
        effect(r, "nova", p, now);
      }
    }
    for (const pad of arenas[arena].pads ?? []) {
      if (
        now >= (p.portalUntil ?? 0) &&
        Math.hypot(p.x - pad.x, p.y - pad.y) < 23 &&
        !blocked(pad.toX, pad.toY, 13, arena, r.brokenWalls)
      ) {
        p.x = pad.toX;
        p.y = pad.toY;
        p.portalUntil = now + 2000;
        p.vx = p.vy = 0;
        effect(r, "portal", p, now);
        break;
      }
    }
    for (const pickup of r.pickups ?? []) {
      if (
        now >= pickup.availableAt &&
        Math.hypot(p.x - pickup.x, p.y - pickup.y) < 25
      ) {
        if (pickup.kind === "health" && p.hp >= maxHealth(p)) continue;
        if (
          pickup.kind === "shield" &&
          p.absorption >= pickups.shield.amount &&
          now < p.absorptionUntil
        )
          continue;
        if (pickup.kind === "health")
          p.hp = Math.min(maxHealth(p), p.hp + pickups.health.amount);
        if (pickup.kind === "speed")
          p.speedUntil = now + pickups.speed.duration;
        if (pickup.kind === "damage")
          p.damageUntil = now + pickups.damage.duration;
        if (pickup.kind === "shield") {
          p.absorption = pickups.shield.amount;
          p.absorptionUntil = now + pickups.shield.duration;
        }
        pickup.availableAt = now + PICKUP_RESPAWN;
        effect(r, "pickup", p, now);
      }
    }
    const hazard = (arenas[arena].hazards ?? []).find(
      (h) =>
        (h.kind === "lava" || h.kind === "vent") &&
        inside(p, h) &&
        hazardActive(h, now),
    );
    if (hazard && now >= (p.environmentTick ?? 0)) {
      p.environmentTick = now + 1000;
      damage(r, p, hazard.damage ?? 5, 1 - p.team, "arena", now);
    }
    if (p.respawn) continue;
    r.crystals = r.crystals.filter((c) => {
      if (Math.hypot(c.x - p.x, c.y - p.y) < 26) {
        r.scores[p.team] += mode === "blitz" ? 2 : 1;
        p.collected++;
        effect(r, "crystal", { ...c, team: p.team }, now);
        return false;
      }
      return true;
    });
  }
  r.bolts = r.bolts.filter((b) => {
    if (b.life <= 0) return false;
    const elapsed = dt + Math.min(0.2, b.catchup ?? 0);
    b.catchup = undefined;
    const travelTime = Math.min(elapsed, b.life);
    const steps = Math.max(
      1,
      Math.ceil((Math.hypot(b.vx, b.vy) * travelTime) / 8),
    );
    for (let step = 0; step < steps; step++) {
      b.x += (b.vx * travelTime) / steps;
      b.y += (b.vy * travelTime) / steps;
      const wallIndex = arenas[arena].walls.findIndex(
        (w, i) =>
          !r.brokenWalls?.includes(i) &&
          b.x + 4 > w.x &&
          b.x - 4 < w.x + w.w &&
          b.y + 4 > w.y &&
          b.y - 4 < w.y + w.h,
      );
      if (wallIndex >= 0) {
        if (arenas[arena].walls[wallIndex].cracked) {
          r.wallHits ??= {};
          r.wallHits[wallIndex] = (r.wallHits[wallIndex] ?? 0) + 1;
          if (r.wallHits[wallIndex] >= 3) {
            r.brokenWalls ??= [];
            r.brokenWalls.push(wallIndex);
            effect(r, "break", { ...b, team: b.team }, now);
          }
        }
        return false;
      }
      if (blocked(b.x, b.y, 4, arena, r.brokenWalls)) return false;
      for (const p of r.players) {
        if (
          p.team === b.team ||
          p.respawn ||
          !p.online ||
          Math.hypot(p.x - b.x, p.y - b.y) > 20
        )
          continue;
        if (now < p.guard) {
          b.vx = -b.vx;
          b.vy = -b.vy;
          b.owner = p.id;
          b.team = p.team;
          const n = Math.hypot(b.vx, b.vy) || 1;
          b.x = p.x + (b.vx / n) * 28;
          b.y = p.y + (b.vy / n) * 28;
          effect(r, "reflect", p, now);
          b.life -= elapsed;
          return b.life > 0;
        }
        damage(
          r,
          p,
          b.damage ?? 20,
          b.team,
          b.owner,
          now,
          b.weaponId === "rifle",
        );
        return false;
      }
    }
    b.life -= elapsed;
    return b.life > 0;
  });
  const bounds = playableBounds(r, now);
  if (r.phase === "overtime")
    for (const p of r.players) {
      if (
        p.online &&
        !p.respawn &&
        (p.x < bounds.x ||
          p.x > W - bounds.x ||
          p.y < bounds.y ||
          p.y > H - bounds.y) &&
        now >= (p.stormTick ?? 0)
      ) {
        p.stormTick = now + 1000;
        damage(r, p, 25, 1 - p.team, "storm", now);
      }
    }
  if (usesCrystals(mode) && now >= r.nextCrystal) {
    r.nextCrystal = now + 3500;
    if (r.crystals.length < 5) {
      const points = arenas[arena].spawns;
      r.spawnIndex = ((r.spawnIndex ?? 0) + 1) % points.length;
      const c = { ...points[r.spawnIndex] };
      if (
        !blocked(c.x, c.y, 20, arena, r.brokenWalls) &&
        !r.crystals.some((p) => p.x === c.x && p.y === c.y)
      )
        r.crystals.push(c);
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
      r.overtimeStart = now;
      r.end = now + 30000;
    } else finish(r);
  }
}

export type PlayerView = Omit<Player, "input" | "lastInput"> & {
  moving: boolean;
  angle: number;
  moveX: number;
  moveY: number;
  hidden: boolean;
  inBush: boolean;
};
export type Snapshot = Omit<Room, "players" | "updated" | "emptySince"> & {
  players: PlayerView[];
  now: number;
};
export function snapshot(r: Room, now: number, viewerId?: string): Snapshot {
  const viewer = r.players.find((p) => p.id === viewerId);
  const { updated, emptySince, ...rest } = r;
  return {
    ...rest,
    effects: r.effects?.filter(
      (e) =>
        now - e.at < 600 &&
        (!viewer || viewer.team === e.team || !inBush(e, r.arena ?? "astral")),
    ),
    players: r.players.map(({ input, lastInput, ...p }) => ({
      ...p,
      hidden:
        !!viewer && viewer.team !== p.team && inBush(p, r.arena ?? "astral"),
      inBush: inBush(p, r.arena ?? "astral"),
      x:
        viewer && viewer.team !== p.team && inBush(p, r.arena ?? "astral")
          ? -1000
          : p.x,
      y:
        viewer && viewer.team !== p.team && inBush(p, r.arena ?? "astral")
          ? -1000
          : p.y,
      moving: Math.hypot(input.x, input.y) > 0.1 || now < p.burst,
      angle: input.angle,
      moveX: now < p.burst ? (p.dashX ?? input.x) : input.x,
      moveY: now < p.burst ? (p.dashY ?? input.y) : input.y,
    })),
    now,
  };
}
export function removeExpiredPlayer(
  r: Room,
  id: string,
  at: number | undefined,
  sessions: Map<string, { code: string; id: string }>,
) {
  const p = r.players.find((p) => p.id === id);
  if (!p || p.online || p.lastInput !== at) return false;
  r.players = r.players.filter((p) => p.id !== id);
  for (const [token, session] of sessions)
    if (session.code === r.code && session.id === id) sessions.delete(token);
  return true;
}

export function playableBounds(
  r: Pick<Room, "phase" | "overtimeStart">,
  now: number,
) {
  const step =
    r.phase === "overtime"
      ? Math.max(0, Math.floor((now - (r.overtimeStart ?? now)) / 5000))
      : 0;
  return { x: Math.min(360, step * 60), y: Math.min(210, step * 35) };
}

export function inside(
  p: { x: number; y: number },
  z: { x: number; y: number; w: number; h: number },
) {
  return p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h;
}
export function hazardActive(h: Zone, now: number) {
  return h.kind !== "vent" || now % 4000 < 1500;
}
export function inBush(p: { x: number; y: number }, arena: ArenaId) {
  return (arenas[arena].hazards ?? []).some(
    (h) => h.kind === "bush" && inside(p, h),
  );
}
export function movementVelocity(
  p: {
    x: number;
    y: number;
    burst: number;
    dashX?: number;
    dashY?: number;
    speedUntil?: number;
    classId?: ClassId;
    vx?: number;
    vy?: number;
  },
  a: Pick<Input, "x" | "y">,
  now: number,
  dt: number,
  arena: ArenaId,
) {
  const n = Math.max(1, Math.hypot(a.x, a.y)),
    speed = moveSpeed(p, now);
  let x = (now < p.burst ? (p.dashX ?? a.x / n) : a.x / n) * speed,
    y = (now < p.burst ? (p.dashY ?? a.y / n) : a.y / n) * speed;
  if (
    now >= p.burst &&
    (arenas[arena].hazards ?? []).some((h) => h.kind === "ice" && inside(p, h))
  ) {
    const k = 1 - Math.exp(-dt * 3);
    x = (p.vx ?? 0) + (x - (p.vx ?? 0)) * k;
    y = (p.vy ?? 0) + (y - (p.vy ?? 0)) * k;
  }
  p.vx = x;
  p.vy = y;
  return { x, y };
}
