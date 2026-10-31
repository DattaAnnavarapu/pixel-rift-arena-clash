import { useState } from "react";
import {
  classes,
  weapons,
  type ClassId,
  type WeaponId,
} from "../../server/combat";
import { loadouts, type LoadoutId, type Snapshot } from "../../server/game";
import { tutorialView } from "../tutorial-director";
export function TutorialRound({
  s,
  now,
  onAction,
  onLeave,
}: {
  s: Snapshot;
  now: number;
  onAction: (a: Record<string, unknown>) => void;
  onLeave: () => void;
}) {
  const [c, setC] = useState<ClassId>("assault"),
    [w, setW] = useState<WeaponId>("blaster"),
    [l, setL] = useState<LoadoutId>("nova");
  const v = tutorialView(
    s,
    now,
    matchMedia("(any-pointer:coarse)").matches || innerWidth < 700,
  );
  if (!v) return null;
  return (
    <aside className="tutorial-hint" role="status">
      <b>
        {v.step + 1}/{v.total} · {v.title}
      </b>
      <p>
        {v.hint}
        {v.stuck
          ? " Look for the ring/arrow, or skip this step and replay later."
          : ""}
      </p>
      {v.step === 0 && (
        <div className="tutorial-choices">
          <select
            aria-label="Tutorial class"
            value={c}
            onChange={(e) => setC(e.target.value as ClassId)}
          >
            {Object.entries(classes).map(([id, c]) => (
              <option key={id} value={id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Tutorial weapon"
            value={w}
            onChange={(e) => setW(e.target.value as WeaponId)}
          >
            {Object.entries(weapons).map(([id, w]) => (
              <option key={id} value={id}>
                {w.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Tutorial special"
            value={l}
            onChange={(e) => setL(e.target.value as LoadoutId)}
          >
            {Object.keys(loadouts).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              onAction({
                action: "choose",
                classId: c,
                weaponId: w,
                loadout: l,
              })
            }
          >
            USE KIT
          </button>
        </div>
      )}
      <div>
        {!v.complete && (
          <button onClick={() => onAction({ action: "skip" })}>
            SKIP STEP
          </button>
        )}
        {v.complete && (
          <button onClick={() => onAction({ action: "replay" })}>REPLAY</button>
        )}
        <button onClick={onLeave}>
          {v.complete ? "RETURN TO MENU" : "SKIP TUTORIAL"}
        </button>
      </div>
    </aside>
  );
}
