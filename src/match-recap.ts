import type { Snapshot } from "../server/game";

/** The same reward breakdown feeds saved progression and the results display. */
export function matchReward(s: Snapshot, id: string) {
  const p = s.players.find((p) => p.id === id);
  const eligible =
    s.phase === "finished" &&
    !s.tutorial &&
    !!s.matchId &&
    !!p &&
    !p.bot &&
    s.finishReason !== "forfeit";
  const completion = eligible ? 100 : 0;
  const win =
    eligible && s.winner === ((p!.resultTeam ?? p!.team) ? "Azure" : "Crimson")
      ? 50
      : 0;
  const contribution = eligible
    ? Math.min(100, p!.kills * 5 + (p!.objectives ?? 0) * 5)
    : 0;
  return {
    completion,
    win,
    contribution,
    total: completion + win + contribution,
  };
}

export function teamContributions(s: Snapshot, team: number) {
  return s.players
    .filter((p) => (p.resultTeam ?? p.team) === team)
    .reduce(
      (total, p) => ({
        damage: total.damage + (p.damageDealt ?? 0),
        healing: total.healing + (p.healingDone ?? 0),
        objectives: total.objectives + (p.objectives ?? 0),
      }),
      { damage: 0, healing: 0, objectives: 0 },
    );
}
