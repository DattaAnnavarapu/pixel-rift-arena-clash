/** Retry only transport-level resume failures; never discard a valid token on timeout. */
export type ResumeReply = { error?: string; id?: string; token?: string; code?: string };
export type ResumeResult =
  | { status: "resumed"; reply: Required<Pick<ResumeReply, "id" | "token" | "code">> }
  | { status: "rejected"; message: string; clearToken: boolean }
  | { status: "unavailable" }
  | { status: "cancelled" };

export const RESUME_BACKOFF_MS = [1000, 2000, 4000] as const;

/** Only explicit invalidation from the authoritative server may erase a token. */
export function isExpiredResume(message: string): boolean {
  return /session expired|server restarted|session (?:is |was )?(?:invalid|revoked)/i.test(message);
}

export function sleepForResume(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error("Resume cancelled"));
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, ms);
    const cancel = () => {
      clearTimeout(timer);
      reject(new Error("Resume cancelled"));
    };
    signal.addEventListener("abort", cancel, { once: true });
  });
}

/** One initial attempt and at most three retries; cancellation prevents stale completion. */
export async function retryResume(
  attempt: (attemptNumber: number) => Promise<ResumeReply>,
  signal: AbortSignal,
  onRetry: (retryNumber: number, delayMs: number) => void = () => {},
  wait: (ms: number, signal: AbortSignal) => Promise<void> = sleepForResume,
): Promise<ResumeResult> {
  for (let index = 0; index <= RESUME_BACKOFF_MS.length; index++) {
    if (signal.aborted) return { status: "cancelled" };
    try {
      const reply = await attempt(index);
      if (signal.aborted) return { status: "cancelled" };
      if (typeof reply?.error === "string") {
        return { status: "rejected", message: reply.error, clearToken: isExpiredResume(reply.error) };
      }
      if (typeof reply?.id === "string" && typeof reply.token === "string" && typeof reply.code === "string" &&
          reply.id.length > 0 && reply.token.length > 0 && reply.code.length > 0) {
        return { status: "resumed", reply: { id: reply.id, token: reply.token, code: reply.code } };
      }
      // A malformed acknowledgment is not evidence that the server invalidated the session.
    } catch {
      if (signal.aborted) return { status: "cancelled" };
    }
    if (index === RESUME_BACKOFF_MS.length) break;
    const delay = RESUME_BACKOFF_MS[index];
    onRetry(index + 1, delay);
    try { await wait(delay, signal); }
    catch { return { status: "cancelled" }; }
  }
  return signal.aborted ? { status: "cancelled" } : { status: "unavailable" };
}
