export const botLevels = {
  easy: {
    reactionMs: 700,
    aimErrorDeg: 18,
    fireIntervalMul: 1.6,
    leadsTargets: false,
    dodgeChance: 0.05,
    abilityUseChance: 0.1,
    decisionMs: 500,
  },
  normal: {
    reactionMs: 350,
    aimErrorDeg: 8,
    fireIntervalMul: 1.2,
    leadsTargets: false,
    dodgeChance: 0.25,
    abilityUseChance: 0.35,
    decisionMs: 300,
  },
  hard: {
    reactionMs: 150,
    aimErrorDeg: 3,
    fireIntervalMul: 1,
    leadsTargets: true,
    dodgeChance: 0.6,
    abilityUseChance: 0.7,
    decisionMs: 150,
  },
  training: {
    reactionMs: 1e9,
    aimErrorDeg: 0,
    fireIntervalMul: 1,
    leadsTargets: false,
    dodgeChance: 0,
    abilityUseChance: 0,
    decisionMs: 1000,
  },
} as const;
export type BotLevel = keyof typeof botLevels;
export function isBotLevel(
  value: unknown,
): value is Exclude<BotLevel, "training"> {
  return value === "easy" || value === "normal" || value === "hard";
}
