import { useState } from "react";
import type { Snapshot } from "../../server/game";
import type { Progress } from "../progress";
export const rewards = [
  { xp: 0, name: "Rift Rookie", theme: "classic", color: "#b899ff" },
  { xp: 300, name: "Trailblazer", theme: "mint", color: "#81ecc5" },
  { xp: 750, name: "Flagbearer", theme: "gold", color: "#f6ce7e" },
  { xp: 1500, name: "Rift Veteran", theme: "rose", color: "#ff94b4" },
];
export function Progression({
  progress,
  onEquip,
}: {
  progress: Progress;
  onEquip: (theme: string) => void;
}) {
  const xp = progress.xp ?? 0,
    level = 1 + Math.floor(xp / 250);
  const [selected, setSelected] = useState(
    () => localStorage.getItem("rift-theme") ?? "classic",
  );
  return (
    <section className="progression">
      <div>
        <span className="eyebrow">YOUR RIFT JOURNEY</span>
        <h2>
          Level {level} <small> · {xp} XP</small>
        </h2>
        <p>
          {progress.matches ?? 0} completed matches · {250 - (xp % 250)} XP to
          next level
        </p>
        <progress
          value={xp % 250}
          max={250}
          aria-label="Experience to next level"
        />
        <p className="quiet">
          Finish a match: 100 XP · win: +50 · contributions: up to +100. Saved
          on this browser. Cosmetic unlocks only.
        </p>
      </div>
      <div className="reward-grid">
        {rewards.map((r) => (
          <button
            key={r.theme}
            disabled={xp < r.xp}
            aria-pressed={selected === r.theme}
            onClick={() => {
              setSelected(r.theme);
              onEquip(r.theme);
            }}
            style={{ borderColor: xp >= r.xp ? r.color : undefined }}
          >
            <b>
              {xp >= r.xp ? "✦" : "◇"} {r.name}
            </b>
            <small>
              {xp < r.xp
                ? `${r.xp} XP to unlock`
                : selected === r.theme
                  ? "EQUIPPED · interface theme"
                  : "UNLOCKED · equip theme"}
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}
export function Contributions({ s }: { s: Snapshot }) {
  return (
    <div className="contributions">
      <h3>TEAM CONTRIBUTIONS</h3>
      <p className="quiet">
        Objectives: crystals, control seconds, flag returns (+1) and captures
        (+3). Healing includes restored HP from Mend.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>KOs</th>
              <th>Damage</th>
              <th>Healing</th>
              <th>Objectives</th>
              <th>Captures</th>
              <th>Returns</th>
            </tr>
          </thead>
          <tbody>
            {s.players.map((p) => (
              <tr key={p.id} className={p.team ? "blue" : "red"}>
                <th>
                  {p.name}
                  {p.bot ? " · BOT" : ""}
                </th>
                <td>{p.kills}</td>
                <td>{p.damageDealt ?? 0}</td>
                <td>{p.healingDone ?? 0}</td>
                <td>{p.objectives ?? 0}</td>
                <td>{p.captures ?? 0}</td>
                <td>{p.returns ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
