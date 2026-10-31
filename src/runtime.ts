import { weapons } from "../server/combat";
import { SnapshotBuffer } from "./netcode";
export const snapshots = new SnapshotBuffer();
import type { Snapshot, Input } from "../server/game";
import type { SentInput } from "./prediction";
export const shotRequests: { id: number; at: number }[] = [];
let shotSerial = Date.now() * 1000,
  nextShotAt = 0;
export const sentInputs: SentInput[] = [];
export let roundTrip = 0;
export function setRoundTrip(ms: number) {
  roundTrip = Math.max(0, Math.min(2000, ms));
}
export type { Snapshot };
export let state: Snapshot | null = null,
  me = "",
  offset = 0;
export const input: Input = {
  x: 0,
  y: 0,
  angle: 0,
  fire: false,
  dash: false,
  shield: false,
  special: false,
};
export const touch = {
  move: false,
  aim: false,
  firing: false,
  dash: false,
  shield: false,
  special: false,
};
export function identify(id: string) {
  me = id;
  sentInputs.length = 0;
  shotRequests.length = 0;
  nextShotAt = 0;
  shotSerial = Math.max(shotSerial, Date.now() * 1000);
}
export function receive(r: Snapshot | null) {
  state = r;
  if (r) snapshots.push(r);
  else snapshots.frames = [];
  if (r) offset = r.now - Date.now() + roundTrip / 2;
}
export function resetInput() {
  shotRequests.length = 0;
  for (const key of Object.keys(
    pendingActions,
  ) as (keyof typeof pendingActions)[])
    pendingActions[key] = false;
  input.x = input.y = 0;
  input.fire = input.dash = input.shield = input.special = false;
  touch.firing = false;
  touch.move = touch.dash = touch.shield = touch.special = false;
}

export let uiPaused = false;
export function pauseInput(paused: boolean) {
  uiPaused = paused;
  if (paused) resetInput();
}

const pendingActions = {
  fire: false,
  dash: false,
  shield: false,
  special: false,
};
export function queueAction(action: keyof typeof pendingActions) {
  if (!uiPaused) pendingActions[action] = true;
}
export function inputPacket(sequence: number, at = Date.now()) {
  prepareShot(at);
  const packet = { ...input, fire: input.fire || touch.firing, sequence };
  for (const key of Object.keys(
    pendingActions,
  ) as (keyof typeof pendingActions)[]) {
    packet[key] = packet[key] || pendingActions[key];
    pendingActions[key] = false;
  }
  sentInputs.push({ sequence, at, input: { ...packet } });
  while (
    sentInputs.length > 90 ||
    (sentInputs[0] && at - sentInputs[0].at > 1500)
  )
    sentInputs.shift();
  return {
    ...packet,
    history: sentInputs.slice(-3, -1).map((c) => ({ ...c.input })),
  };
}

/** Shared by frame rendering and packet dispatch, so short taps get fresh IDs too. */
export function prepareShot(at = Date.now()) {
  const p = state?.players.find((p) => p.id === me);
  if (
    uiPaused ||
    !p ||
    p.respawn ||
    p.ammo <= 0 ||
    Date.now() + offset < p.reloadAt ||
    at < nextShotAt ||
    !(input.fire || touch.firing || pendingActions.fire)
  )
    return;
  const id = ++shotSerial;
  input.shotId = id;
  nextShotAt = at + weapons[p.weaponId].interval;
  shotRequests.push({ id, at });
  while (shotRequests.length > 8) shotRequests.shift();
}
