import { test } from "node:test";
import assert from "node:assert/strict";
import { isEmote, teamMarkers } from "../server/social.js";
import { panFor, pingClass } from "../src/feedback.js";
test("social IDs are whitelisted and teams use different shapes", () => {
  for (const id of ["gg", "hello", "nice", "thanks"]) assert.ok(isEmote(id));
  for (const id of ["__proto__", "spam", {}, null])
    assert.equal(isEmote(id), false);
  assert.notEqual(teamMarkers[0], teamMarkers[1]);
});
test("pan and ping feedback is bounded and tolerates missing data", () => {
  assert.equal(panFor(10000, 0), 1);
  assert.equal(panFor(-10000, 0), -1);
  assert.equal(panFor(NaN, 0), 0);
  assert.equal(pingClass(400), "ping-high");
  assert.equal(pingClass(undefined), "ping-unknown");
});
