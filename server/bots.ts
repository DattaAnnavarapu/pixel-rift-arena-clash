import { botLevels } from "./bot-config.js";
import { findPath, seeded, type Point } from "./pathfinding.js";
import type { Player } from "./game.js";
const brains = new WeakMap<
  Player,
  {
    next: number;
    enemy: string;
    seen: number;
    fire: number;
    path: Point[];
    goal: string;
    match?: string;
  }
>();
const randoms = new WeakMap<Room, () => number>();
import {
  classes,
  weapons,
  maxHealth,
  type ClassId,
  type WeaponId,
} from "./combat.js";
import { blocked, inBush, usesCrystals, player, type Room } from "./game.js";
export function manageBots(r: Room, actor: string, add: boolean) {
  if (actor !== r.host || !["lobby", "finished"].includes(r.phase))
    return false;
  if (!add) {
    r.players = r.players.filter((p) => !p.bot);
    return true;
  }
  while (r.players.length < 4) {
    const t =
      r.players.filter((p) => p.team === 0).length <=
      r.players.filter((p) => p.team === 1).length
        ? 0
        : 1;
    const b = player(
      `bot-${r.code}-${Date.now()}-${r.players.length}`,
      `Riftbot ${r.players.filter((p) => p.bot).length + 1}`,
      t,
    );
    const index = r.players.filter((p) => p.bot).length;
    b.classId = (Object.keys(classes) as ClassId[])[index % 3];
    b.weaponId = (Object.keys(weapons) as WeaponId[])[index % 3];
    b.hp = maxHealth(b);
    b.ammo = weapons[b.weaponId].magazine;
    b.botLevel = r.botLevel ?? "normal";
    if (b.botLevel === "easy") {
      b.classId = "assault";
      b.weaponId = "blaster";
      b.hp = maxHealth(b);
      b.ammo = weapons.blaster.magazine;
    }
    if (b.botLevel === "hard")
      b.loadout = (["nova", "mend", "pulse", "blink"] as const)[index % 4];
    b.bot = true;
    b.ready = true;
    r.players.push(b);
  }
  return true;
}
export function driveBots(r: Room, now: number) {
  let random = randoms.get(r);
  if (!random) {
    random = seeded(r.botSeed ?? 1);
    randoms.set(r, random);
  }
  for (const p of r.players) {
    if (!p.bot || p.respawn) continue;
    const level = p.botLevel ?? r.botLevel ?? "normal",
      config = botLevels[level];
    if (level === "training") {
      p.hp = Math.min(p.hp, 30);
      p.input = {
        x: 0,
        y: 0,
        angle: 0,
        fire: false,
        dash: false,
        shield: false,
        special: false,
      };
      p.lastInput = now;
      continue;
    }
    let brain = brains.get(p);
    if (!brain || brain.match !== r.matchId) {
      brain = {
        next: 0,
        enemy: "",
        seen: now,
        fire: 0,
        path: [],
        goal: "",
        match: r.matchId,
      };
      brains.set(p, brain);
    }
    if (now < brain.next) {
      p.lastInput = now;
      continue;
    }
    brain.next = now + config.decisionMs;
    const enemy = r.players
      .filter(
        (e) =>
          e.online &&
          !e.respawn &&
          e.team !== p.team &&
          !inBush(e, r.arena ?? "astral"),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
      )[0];
    const flag = r.flags?.[1 - p.team],
      own = r.flags?.[p.team];
    const target =
      r.mode === "ctf" && flag && own
        ? flag.carrier === p.id
          ? own.carrier || own.droppedAt !== undefined
            ? own
            : { x: p.team ? 870 : 90, y: 300 }
          : own.carrier || own.droppedAt !== undefined
            ? own
            : flag
        : usesCrystals(r.mode ?? "crystal") && r.crystals.length
          ? r.crystals.reduce((a, b) =>
              Math.hypot(a.x - p.x, a.y - p.y) <
              Math.hypot(b.x - p.x, b.y - p.y)
                ? a
                : b,
            )
          : r.mode === "knockout" && enemy
            ? enemy
            : { x: 480, y: 300 };
    const angle = Math.atan2(target.y - p.y, target.x - p.x),
      distance = enemy ? Math.hypot(enemy.x - p.x, enemy.y - p.y) : 1000;
    let direction =
      angle +
      (Math.hypot(target.x - p.x, target.y - p.y) < 65
        ? Math.PI / 2
        : Math.sin(now / 600 + p.team) * 0.4);
    let x = 0,
      y = 0;
    for (const turn of [
      0,
      0.6,
      -0.6,
      1.2,
      -1.2,
      Math.PI / 2,
      -Math.PI / 2,
      Math.PI,
    ]) {
      const a = direction + turn;
      if (
        !blocked(
          p.x + Math.cos(a) * 35,
          p.y + Math.sin(a) * 35,
          13,
          r.arena,
          r.brokenWalls,
        )
      ) {
        x = Math.cos(a);
        y = Math.sin(a);
        break;
      }
    }
    if (brain.enemy !== (enemy?.id ?? "")) {
      brain.enemy = enemy?.id ?? "";
      brain.seen = now;
    }
    const lead =
      enemy && config.leadsTargets
        ? Math.min(0.6, distance / weapons[p.weaponId].speed)
        : 0;
    const aim = enemy
      ? Math.atan2(
          enemy.y + (enemy.vy ?? 0) * lead - p.y,
          enemy.x + (enemy.vx ?? 0) * lead - p.x,
        ) +
        ((random() * 2 - 1) * config.aimErrorDeg * Math.PI) / 180
      : angle;
    const goal = `${Math.floor(target.x / 32)}:${Math.floor(target.y / 32)}`;
    if (goal !== brain.goal || brain.path.length === 0) {
      brain.path = findPath(p, target, r.arena ?? "astral", r.brokenWalls);
      brain.goal = goal;
    }
    while (
      brain.path.length &&
      Math.hypot(brain.path[0].x - p.x, brain.path[0].y - p.y) < 20
    )
      brain.path.shift();
    const waypoint = brain.path[0];
    if (waypoint) {
      const a = Math.atan2(waypoint.y - p.y, waypoint.x - p.x);
      x = Math.cos(a);
      y = Math.sin(a);
    }
    if (enemy && distance < 250 && random() < config.dodgeChance) {
      const a = aim + Math.PI / 2;
      if (
        !blocked(
          p.x + Math.cos(a) * 30,
          p.y + Math.sin(a) * 30,
          13,
          r.arena,
          r.brokenWalls,
        )
      ) {
        x = Math.cos(a);
        y = Math.sin(a);
      }
    }
    const los =
      enemy &&
      Array.from(
        { length: 8 },
        (_, i) =>
          !blocked(
            p.x + ((enemy.x - p.x) * (i + 1)) / 9,
            p.y + ((enemy.y - p.y) * (i + 1)) / 9,
            4,
            r.arena,
            r.brokenWalls,
          ),
      ).every(Boolean);
    const shoot =
      distance < weapons[p.weaponId].speed * weapons[p.weaponId].life &&
      !!los &&
      now - brain.seen >= config.reactionMs &&
      now >= brain.fire;
    if (shoot)
      brain.fire = now + weapons[p.weaponId].interval * config.fireIntervalMul;
    const ability = random() < config.abilityUseChance;
    p.input = {
      x,
      y,
      angle: aim,
      fire: shoot,
      dash: ability && p.hp < maxHealth(p) * 0.4,
      shield: ability && distance < 260,
      special:
        ability &&
        (p.loadout === "mend" ? p.hp < maxHealth(p) * 0.75 : distance < 330),
    };
    p.lastInput = now;
  }
}
