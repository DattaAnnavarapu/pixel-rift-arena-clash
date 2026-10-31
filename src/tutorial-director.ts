import type { Snapshot } from "../server/game";
import { TUTORIAL_STEPS } from "../server/tutorial";
export function tutorialView(s: Snapshot, now: number, touch: boolean) {
  if (!s.tutorial || !s.tutorialState) return;
  const t = s.tutorialState;
  const hints = [
    "Pick class, weapon and special. These are independent.",
    "Move into the glowing ring.",
    `Hit dummies ${t.hits}/3.`,
    "Keep firing until the magazine empties; reload is automatic.",
    touch ? "Tap DASH." : "Press Space to dash.",
    touch
      ? "Tap SHIELD as a practice bolt approaches."
      : "Press E as a practice bolt approaches.",
    touch ? "Tap your special button." : "Press Q to use your special.",
    `Collect health, shield, speed and damage (${t.picked.length}/4).`,
    "Collect the crystal at the center.",
    "Fight the Easy bot. Try respawning once and score a KO.",
    "Training complete. Replay or return to the menu.",
  ];
  return {
    step: t.step,
    total: TUTORIAL_STEPS.length,
    title: TUTORIAL_STEPS[t.step] ?? "Complete",
    hint: hints[t.step] ?? hints[10],
    stuck: now - t.entered > 15000,
    target: s.tutorialTarget,
    complete: t.step >= 10,
  };
}
