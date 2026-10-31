/** Radial dead zone avoids drift; normalize diagonals without changing aim at rest. */
export function joystickVector(
  dx: number,
  dy: number,
  radius: number,
  deadZone = 0.16,
) {
  const length = Math.hypot(dx, dy),
    raw = length / Math.max(1, radius);
  if (!Number.isFinite(raw) || raw <= deadZone)
    return { x: 0, y: 0, active: false };
  const strength = Math.min(1, (raw - deadZone) / (1 - deadZone));
  return {
    x: (dx / length) * strength,
    y: (dy / length) * strength,
    active: true,
  };
}
