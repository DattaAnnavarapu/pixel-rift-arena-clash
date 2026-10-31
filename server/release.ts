import { modes, start, type ModeId, type Room } from "./game.js";
export const PROTOCOL_VERSION = 3;
export const RELEASE_VERSION = "1.2.0-alpha.1";
export function findPublicRoom(rooms: Iterable<Room>, mode: ModeId) {
  return [...rooms]
    .filter(
      (r) =>
        r.publicMatch &&
        r.mode === mode &&
        r.phase === "lobby" &&
        r.players.length < 4 &&
        r.players.some((p) => p.online && !p.bot),
    )
    .sort(
      (a, b) => b.players.length - a.players.length || a.updated - b.updated,
    )[0];
}
export function updateMatchmaking(r: Room, now: number) {
  if (!r.publicMatch || r.phase !== "lobby") return;
  const humans = r.players.filter((p) => p.online && !p.bot),
    players = r.players.filter((p) => p.online);
  if (humans.length >= 2) {
    if (!humans.some((p) => p.team === 0)) humans.at(-1)!.team = 0;
    if (!humans.some((p) => p.team === 1)) humans.at(-1)!.team = 1;
  }
  if (
    humans.length < 2 ||
    !players.every((p) => p.ready) ||
    ![0, 1].every((t) => players.some((p) => p.team === t))
  ) {
    r.startsAt = undefined;
    return;
  }
  r.startsAt ??= now + 5000;
  if (now >= r.startsAt) {
    r.startsAt = undefined;
    start(r, now);
  }
}
export function removePlayer(
  r: Room,
  id: string,
  sessions: Map<string, { code: string; id: string }>,
) {
  r.players = r.players.filter((p) => p.id !== id);
  for (const [token, s] of sessions)
    if (s.code === r.code && s.id === id) sessions.delete(token);
  if (r.host === id)
    r.host = r.players.find((p) => p.online && !p.bot)?.id ?? "";
  r.startsAt = undefined;
}
export function validSequence(value: unknown, last = -1) {
  return (
    value === undefined ||
    (Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) > last)
  );
}
export function validMode(value: unknown): value is ModeId {
  return typeof value === "string" && Object.hasOwn(modes, value);
}
