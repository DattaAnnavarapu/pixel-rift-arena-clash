/** Avoid a duplicate synthetic click after a pointer press; retain keyboard/AT clicks. */
export class ActionLatch {
  private pointer = false;
  down() {
    this.pointer = true;
  }
  cancel() {
    this.pointer = false;
  }
  click(detail: number) {
    const activate = detail === 0 || !this.pointer;
    this.pointer = false;
    return activate;
  }
}
