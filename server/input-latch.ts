import type { Input } from "./game.js";
export type Actions = Pick<Input, "fire" | "dash" | "shield" | "special">;
/** Retain transitions until simulation consumes them, independent of packet/tick rates. */
export class InputLatch {
  private pending = new WeakMap<object, Actions>();
  capture(player: object, input: Actions) {
    const old = this.pending.get(player);
    this.pending.set(player, {
      fire: !!old?.fire || input.fire,
      dash: !!old?.dash || input.dash,
      shield: !!old?.shield || input.shield,
      special: !!old?.special || !!input.special,
    });
  }
  consume(player: object) {
    const value = this.pending.get(player);
    this.pending.delete(player);
    return value;
  }
}
