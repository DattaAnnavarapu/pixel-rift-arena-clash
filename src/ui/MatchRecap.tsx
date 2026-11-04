import type { Snapshot } from "../../server/game";
import { matchReward, teamContributions } from "../match-recap";

export function MatchRecap({ s, id }: { s: Snapshot; id: string }) {
  const self = s.players.find((p) => p.id === id);
  const reward = matchReward(s, id);
  return (
    <section className="match-recap" aria-label="Match recap">
      {self && !s.tutorial && (
        <div className="personal-recap">
          <div>
            <span className="eyebrow">YOUR ROUND</span>
            <h3>
              {s.winner === "Draw"
                ? "Honors shared."
                : s.winner ===
                    ((self.resultTeam ?? self.team) ? "Azure" : "Crimson")
                  ? "Victory, together."
                  : "Next round is yours."}
            </h3>
          </div>
          <strong className="earned-xp">+{reward.total} XP</strong>
          <p>
            {s.finishReason === "forfeit"
              ? "Forfeit round · no completion XP."
              : `${reward.completion} completion + ${reward.win} win + ${reward.contribution} contributions. Saved on this browser when storage is available.`}
          </p>
          <div className="recap-stats">
            <span>
              <b>
                {self.kills} / {self.deaths}
              </b>
              KOs / deaths
            </span>
            <span>
              <b>{self.damageDealt ?? 0}</b>Damage
            </span>
            <span>
              <b>{self.healingDone ?? 0}</b>Healing
            </span>
            <span>
              <b>{self.objectives ?? 0}</b>Objectives
            </span>
          </div>
        </div>
      )}
      <div className="team-recaps">
        {[0, 1].map((team) => {
          const total = teamContributions(s, team);
          return (
            <div key={team} className={team ? "blue" : "red"}>
              <b>{team ? "▲ AZURE" : "■ CRIMSON"}</b>
              <span>
                {total.damage} damage · {total.healing} healing
              </span>
              <small>{total.objectives} objective contributions</small>
            </div>
          );
        })}
      </div>
      <p className="quiet">
        {!self
          ? "Players can ready up for another round. You will remain a spectator."
          : s.publicMatch
            ? "Ready up for a rematch. A five-second countdown starts when everyone is ready."
            : "Ready up to play again with this room. The host starts the rematch."}
      </p>
    </section>
  );
}
