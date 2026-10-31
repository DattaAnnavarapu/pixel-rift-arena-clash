/** Shared, trusted combat rules. Clients submit identifiers, never derived stats. */
export const classes = {
  assault: { name: "Assault", hp: 100, speed: 175, damage: 1, glyph: "◆" },
  tank: { name: "Tank", hp: 140, speed: 145, damage: 0.85, glyph: "▣" },
  scout: { name: "Scout", hp: 80, speed: 210, damage: 0.9, glyph: "»" },
} as const;
export type ClassId = keyof typeof classes;
export const weapons = {
  blaster: {
    name: "Blaster",
    damage: 20,
    interval: 400,
    magazine: 10,
    reload: 1200,
    speed: 420,
    life: 0.9,
    spread: [0],
  },
  shotgun: {
    name: "Shotgun",
    damage: 8,
    interval: 900,
    magazine: 4,
    reload: 1600,
    speed: 420,
    life: 0.55,
    spread: [-0.24, -0.12, 0, 0.12, 0.24],
  },
  rifle: {
    name: "Precision rifle",
    damage: 50,
    interval: 1000,
    magazine: 4,
    reload: 1800,
    speed: 640,
    life: 1.1,
    spread: [0],
  },
} as const;
export type WeaponId = keyof typeof weapons;
export const pickups = {
  health: { name: "Health", amount: 35, duration: 0 },
  shield: { name: "Shield", amount: 35, duration: 5000 },
  speed: { name: "Speed", amount: 1.4, duration: 5000 },
  damage: { name: "Double damage", amount: 2, duration: 5000 },
} as const;
export type PickupKind = keyof typeof pickups;
export const PICKUP_RESPAWN = 15000;
export function maxHealth(p: { classId?: ClassId }) {
  return classes[p.classId ?? "assault"].hp;
}
export function moveSpeed(
  p: { classId?: ClassId; burst: number; speedUntil?: number },
  now: number,
) {
  return now < p.burst
    ? 650
    : classes[p.classId ?? "assault"].speed *
        (now < (p.speedUntil ?? 0) ? pickups.speed.amount : 1);
}
export function outgoingDamage(
  p: { classId?: ClassId; damageUntil?: number },
  base: number,
  now: number,
) {
  return Math.round(
    base *
      classes[p.classId ?? "assault"].damage *
      (now < (p.damageUntil ?? 0) ? pickups.damage.amount : 1),
  );
}
export function isClass(value: unknown): value is ClassId {
  return typeof value === "string" && Object.hasOwn(classes, value);
}
export function isWeapon(value: unknown): value is WeaponId {
  return typeof value === "string" && Object.hasOwn(weapons, value);
}
