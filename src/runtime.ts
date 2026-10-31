import type { Snapshot, Input } from "../server/game";
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
  dash: false,
  shield: false,
  special: false,
};
export function identify(id: string) {
  me = id;
}
export function receive(r: Snapshot | null) {
  state = r;
  if (r) offset = r.now - Date.now();
}
export function resetInput() {
  for (const key of Object.keys(
    pendingActions,
  ) as (keyof typeof pendingActions)[])
    pendingActions[key] = false;
  input.x = input.y = 0;
  input.fire = input.dash = input.shield = input.special = false;
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
export function inputPacket(sequence: number) {
  const packet = { ...input, sequence };
  for (const key of Object.keys(
    pendingActions,
  ) as (keyof typeof pendingActions)[]) {
    packet[key] = packet[key] || pendingActions[key];
    pendingActions[key] = false;
  }
  return packet;
}
