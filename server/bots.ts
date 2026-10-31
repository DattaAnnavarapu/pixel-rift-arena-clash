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
    b.bot = true;
    b.ready = true;
    r.players.push(b);
  }
  return true;
}
export function driveBots(r: Room, now: number) {
  for (const p of r.players) {
    if (!p.bot || p.respawn) continue;
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
    const target =
      usesCrystals(r.mode ?? "crystal") && r.crystals.length
        ? r.crystals.reduce((a, b) =>
            Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y)
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
    const aim = enemy
      ? Math.atan2(enemy.y - p.y, enemy.x - p.x) +
        Math.sin(now / 300 + p.x) * 0.14
      : angle;
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
    p.input = {
      x,
      y,
      angle: aim,
      fire:
        distance < weapons[p.weaponId].speed * weapons[p.weaponId].life &&
        !!los,
      dash: p.hp < maxHealth(p) * 0.4,
      shield: distance < 260,
      special:
        p.loadout === "mend" ? p.hp < maxHealth(p) * 0.75 : distance < 330,
    };
    p.lastInput = now;
  }
}
