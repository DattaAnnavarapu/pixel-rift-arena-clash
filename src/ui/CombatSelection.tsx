import {
  classes,
  weapons,
  type ClassId,
  type WeaponId,
} from "../../server/combat";
const classRoles = {
  assault: "Balanced frontline",
  tank: "Durable defender",
  scout: "Fast flanker",
  medic: "Team healer · pair with Mend",
  ranger: "Mobile skirmisher",
};
const weaponRoles = {
  blaster: "Steady mid-range",
  shotgun: "Close-range burst",
  rifle: "Long-range precision",
  repeater: "Rapid sustained fire",
  scatter: "Twin-shot pressure",
};
export function CombatSelection({
  classId,
  weaponId,
  onSelect,
}: {
  classId: ClassId;
  weaponId: WeaponId;
  onSelect: (choice: { classId?: ClassId; weaponId?: WeaponId }) => void;
}) {
  return (
    <div className="combat-selection">
      <fieldset>
        <legend>YOUR CLASS</legend>
        <div>
          {(Object.keys(classes) as ClassId[]).map((id) => {
            const c = classes[id];
            return (
              <button
                key={id}
                aria-pressed={classId === id}
                onClick={() => onSelect({ classId: id })}
              >
                <b>
                  {c.glyph} {c.name}
                </b>
                <small className="kit-role">{classRoles[id]}</small>
                <small>
                  {c.hp} HP · {c.speed} speed · {Math.round(c.damage * 100)}%
                  damage
                </small>
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend>YOUR WEAPON · AUTO RELOAD</legend>
        <div>
          {(Object.keys(weapons) as WeaponId[]).map((id) => {
            const w = weapons[id];
            return (
              <button
                key={id}
                aria-pressed={weaponId === id}
                onClick={() => onSelect({ weaponId: id })}
              >
                <b>{w.name}</b>
                <small className="kit-role">{weaponRoles[id]}</small>
                <small>
                  {w.damage}
                  {w.spread.length > 1 ? ` × ${w.spread.length}` : ""} damage ·{" "}
                  {w.interval / 1000}s fire
                </small>
                <small>
                  {w.magazine} ammo · {w.reload / 1000}s reload ·{" "}
                  {Math.round(w.speed * w.life)}px range
                </small>
              </button>
            );
          })}
        </div>
      </fieldset>
      <p>
        Medic + Mend also heals teammates within 100px. Ranger trades armor for
        mobility. Class, weapon and special are independent choices. Shield
        pickups absorb 35 damage for up to 5s; E shield still reflects bolts.
        Health +35; speed ×1.4 and damage ×2 last 5s. Pickups return after 15s.
      </p>
    </div>
  );
}
