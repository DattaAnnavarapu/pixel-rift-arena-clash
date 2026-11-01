import { test } from "node:test";
import assert from "node:assert/strict";
import { isExpiredResume, retryResume, RESUME_BACKOFF_MS } from "../src/resume.js";

const succeeded = { id: "p1", token: "kept-token", code: "ABC123" };
const immediateWait = async (_ms: number, _signal: AbortSignal) => {};

test("transient timeout retries with 1s/2s/4s delay and retains session", async () => {
  const delays: number[] = [];
  const attempts: number[] = [];
  const outcome = await retryResume(
    async (index) => {
      attempts.push(index);
      if (index < 3) throw new Error("timeout");
      return succeeded;
    },
    new AbortController().signal,
    (_attempt, delay) => delays.push(delay),
    immediateWait,
  );
  assert.deepEqual(attempts, [0, 1, 2, 3]);
  assert.deepEqual(delays, [...RESUME_BACKOFF_MS]);
  assert.deepEqual(outcome, { status: "resumed", reply: succeeded });
});

test("all four transient attempts fail without a token-clearing rejection", async () => {
  let calls = 0;
  const outcome = await retryResume(
    async () => { calls++; throw new Error("transport closed"); },
    new AbortController().signal,
    undefined,
    immediateWait,
  );
  assert.equal(calls, 4);
  assert.deepEqual(outcome, { status: "unavailable" });
});

test("explicit session expiry or server restart is definitive and stops retries", async () => {
  for (const message of ["Your session expired or the server restarted. Join a new room.", "Session invalid"]) {
    let calls = 0;
    const outcome = await retryResume(
      async () => { calls++; return { error: message }; },
      new AbortController().signal,
      undefined,
      immediateWait,
    );
    assert.equal(calls, 1);
    assert.deepEqual(outcome, { status: "rejected", message, clearToken: true });
    assert.equal(isExpiredResume(message), true);
  }
});

test("nondefinitive server errors and malformed replies never erase a token", async () => {
  assert.deepEqual(
    await retryResume(async () => ({ error: "This player is already connected in another tab." }), new AbortController().signal),
    { status: "rejected", message: "This player is already connected in another tab.", clearToken: false },
  );
  const outcome = await retryResume(async (index) => index ? succeeded : {}, new AbortController().signal, undefined, immediateWait);
  assert.deepEqual(outcome, { status: "resumed", reply: succeeded });
});

test("abort during backoff cancels stale retries without more requests", async () => {
  const controller = new AbortController();
  let calls = 0;
  const result = await retryResume(
    async () => { calls++; throw Error("timeout"); },
    controller.signal,
    () => controller.abort(),
  );
  assert.deepEqual(result, { status: "cancelled" });
  assert.equal(calls, 1);
});
