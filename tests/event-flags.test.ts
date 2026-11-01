import { test } from "node:test";
import assert from "node:assert/strict";
import { EVENT_FLAGS, eventFeatureEnabled } from "../server/event-flags.js";
test("unverified server-side features default to OFF", () => {
  for (const flag of EVENT_FLAGS)
    assert.equal(eventFeatureEnabled(flag, {}), false);
});
test("explicit server env 1 is required, never a truthy string", () => {
  assert.equal(eventFeatureEnabled("spectator", { PIXEL_RIFT_SPECTATOR: "1" }), true);
  assert.equal(eventFeatureEnabled("spectator", { PIXEL_RIFT_SPECTATOR: "true" }), false);
  assert.equal(eventFeatureEnabled("lagCompensation", { PIXEL_RIFT_LAG_COMPENSATION: "1" }), true);
});
