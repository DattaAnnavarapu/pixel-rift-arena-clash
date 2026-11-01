/** Server-only event flag registry. Defaults OFF for unverified features.
 * Do not expose raw environment variables or introduce protocol fields.
 */
export const EVENT_FLAGS = [
  "spectator",
  "leaderboard",
  "experimentalModes",
  "compactSnapshots",
  "lagCompensation",
  "regionRouting",
  "telemetry",
] as const;

export type EventFlag = (typeof EVENT_FLAGS)[number];

export function eventFeatureEnabled(
  feature: EventFlag,
  environment: Record<string, string | undefined> = process.env,
): boolean {
  const key = `PIXEL_RIFT_${feature.replace(/[A-Z]/g, (c) => "_"+c).toUpperCase()}`;
  return environment[key] === "1";
}
