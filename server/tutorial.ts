import { player, start, blocked, type Room } from "./game.js";
import { maxHealth, weapons, type PickupKind } from "./combat.js";
export type TutorialState = {
  step: number;
  entered: number;
  seen: number;
  hits: number;
  picked: PickupKind[];
  baseKills: number;
  baseDeaths: number;
  nextBolt: number;
};
export const TUTORIAL_STEPS = [
  "Choose your kit",
  "Move to the ring",
  "Land three hits",
  "Empty a magazine / reload",
  "Dash",
  "Reflect a practice bolt",
  "Use your special",
  "Collect four pickups",
  "Collect a crystal",
  "Fight and try respawning",
  "Complete",
] as const;
export function setupTutorial(r: Room, now: number) {
  const human = r.players.find((p) => !p.bot)!;
  r.players = [human];
  r.publicMatch = false;
  r.tutorial = true;
  r.mode = "crystal";
  r.arena = "astral";
  for (let i = 0; i < 2; i++) {
    const dummy = player(`dummy-${r.code}-${i}`, `Training dummy ${i + 1}`, 1);
    dummy.bot = true;
    dummy.botLevel = "training";
    r.players.push(dummy);
  }
  start(r, now);
  r.end = Number.MAX_SAFE_INTEGER;
  human.x = 200;
  human.y = 300;
  r.players
    .filter((p) => p.bot)
    .forEach((p, i) => {
      p.x = 450 + i * 180;
      p.y = 300;
      p.hp = 30;
      p.immune = 0;
    });
  r.tutorialState = {
    step: 0,
    entered: now,
    seen: r.eventId ?? 0,
    hits: 0,
    picked: [],
    baseKills: 0,
    baseDeaths: 0,
    nextBolt: now,
  };
  r.tutorialTarget = { x: 350, y: 300 };
}
export function skipTutorialStep(r: Room, now: number) {
  const t = r.tutorialState;
  if (!t || t.step >= 10) return;
  t.step++;
  t.entered = now;
  t.seen = r.eventId ?? 0;
  const p = r.players.find((p) => !p.bot)!;
  if (t.step === 4) p.dash = 0;
  if (t.step === 5) p.shield = 0;
  if (t.step === 6) {
    p.special = 0;
    p.hp = Math.max(1, maxHealth(p) - 30);
  }
  if (t.step === 7) {
    p.hp = Math.max(1, maxHealth(p) - 35);
    p.absorption = 0;
    r.pickups = (["health", "shield", "speed", "damage"] as const).map(
      (kind, i) => ({ kind, x: 350 + i * 80, y: 300, availableAt: 0 }),
    );
  }
  if (t.step === 8) r.crystals = [{ x: 480, y: 300 }];
  if (t.step === 9) {
    t.baseKills = p.kills;
    t.baseDeaths = p.deaths;
    const bot = r.players.find((p) => p.bot)!;
    r.players = [p, bot];
    bot.botLevel = "easy";
    bot.hp = maxHealth(bot);
    bot.respawn = 0;
    bot.ammo = weapons[bot.weaponId].magazine;
    bot.x = 650;
    bot.y = 300;
    p.hp = maxHealth(p);
  }
  if (t.step === 10)
    for (const bot of r.players.filter((p) => p.bot)) bot.botLevel = "training";
}
export function updateTutorial(r: Room, now: number) {
  const t = r.tutorialState,
    p = r.players.find((p) => !p.bot);
  if (!r.tutorial || !t || !p) return;
  const events = (r.effects ?? []).filter((e) => e.id > t.seen);
  t.seen = r.eventId ?? t.seen;
  const own = events.filter((e) => e.actor === p.id);
  if (t.step === 1 && Math.hypot(p.x - 350, p.y - 300) < 30)
    skipTutorialStep(r, now);
  else if (t.step === 2) {
    t.hits += own.filter(
      (e) =>
        e.kind === "hit" && r.players.some((b) => b.bot && b.id === e.target),
    ).length;
    if (t.hits >= 3) skipTutorialStep(r, now);
  } else if (t.step === 3 && own.some((e) => e.kind === "reload"))
    skipTutorialStep(r, now);
  else if (t.step === 4 && own.some((e) => e.kind === "dash"))
    skipTutorialStep(r, now);
  else if (t.step === 5) {
    if (own.some((e) => e.kind === "reflect")) skipTutorialStep(r, now);
    else if (now >= t.nextBolt) {
      t.nextBolt = now + 1200;
      const direction =
        [0, Math.PI / 2, Math.PI, -Math.PI / 2].find((a) =>
          Array.from(
            { length: 18 },
            (_, i) =>
              !blocked(
                p.x + Math.cos(a) * (i + 1) * 8,
                p.y + Math.sin(a) * (i + 1) * 8,
                4,
                r.arena,
                r.brokenWalls,
              ),
          ).every(Boolean),
        ) ?? 0;
      r.bolts.push({
        x: p.x + Math.cos(direction) * 140,
        y: p.y + Math.sin(direction) * 140,
        vx: -Math.cos(direction) * 180,
        vy: -Math.sin(direction) * 180,
        owner: "practice-emitter",
        team: 1,
        life: 1.3,
        damage: 0,
      });
    }
  } else if (
    t.step === 6 &&
    own.some((e) => ["nova", "mend", "blink", "pulse"].includes(e.kind))
  )
    skipTutorialStep(r, now);
  else if (t.step === 7) {
    for (const e of own)
      if (
        e.kind === "pickup" &&
        e.pickupKind &&
        !t.picked.includes(e.pickupKind)
      )
        t.picked.push(e.pickupKind);
    if (t.picked.length === 4) skipTutorialStep(r, now);
  } else if (t.step === 8 && own.some((e) => e.kind === "crystal"))
    skipTutorialStep(r, now);
  else if (
    t.step === 9 &&
    p.kills > t.baseKills &&
    p.deaths > t.baseDeaths &&
    !p.respawn
  )
    skipTutorialStep(r, now);
  r.tutorialTarget =
    t.step === 1
      ? { x: 350, y: 300 }
      : t.step === 2
        ? r.players.find((b) => b.bot && !b.respawn)
        : t.step === 7
          ? r.pickups?.find((x) => !t.picked.includes(x.kind))
          : t.step === 8
            ? r.crystals[0]
            : undefined;
  if (r.tutorialTarget)
    r.tutorialTarget = { x: r.tutorialTarget.x, y: r.tutorialTarget.y };
}
