import { test } from "node:test";
import assert from "node:assert/strict";
import { allowPolish, polishEnabled, SAFE_MODE_KEY } from "../src/polish.js";

test("safe-mode decision excludes disabled SFX and prior session opt-out", () => {
  assert.equal(allowPolish("", false, true), true);
  assert.equal(allowPolish("", false, false), false);
  assert.equal(allowPolish("", true, true), false);
  assert.equal(allowPolish("?safe=1", false, true), false);
});

test("query opt-out persists for the current browser session", () => {
  const values = new Map<string, string>();
  const before = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = {
    location: { search: "?safe=1" },
    sessionStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  try {
    assert.equal(polishEnabled(true), false);
    assert.equal(values.get(SAFE_MODE_KEY), "1");
    browser.location.search = "";
    assert.equal(polishEnabled(true), false);
    assert.equal(polishEnabled(false), false);
  } finally {
    if (before) Object.defineProperty(globalThis, "window", before);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
