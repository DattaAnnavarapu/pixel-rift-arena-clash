export function panFor(sourceX: number, listenerX: number) {
  return Number.isFinite(sourceX) && Number.isFinite(listenerX)
    ? Math.max(-1, Math.min(1, (sourceX - listenerX) / 480))
    : 0;
}
export function pingClass(ms: number | undefined) {
  return ms === undefined
    ? "ping-unknown"
    : ms > 250
      ? "ping-high"
      : ms > 120
        ? "ping-medium"
        : "ping-good";
}
