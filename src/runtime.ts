import type { Room, Input } from "../server/game";
export type Snapshot = Room & { now: number };
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
  input.x = input.y = 0;
  input.fire = input.dash = input.shield = input.special = false;
  touch.move = touch.dash = touch.shield = touch.special = false;
}
