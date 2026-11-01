import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("src/style.css", "utf8");
const ui = readFileSync("src/main.tsx", "utf8");

test("desktop in-match arena is viewport-bounded with original 16:10 ratio", () => {
  const desktop = css.slice(css.lastIndexOf("/* Event desktop viewport fit."));
  assert.match(desktop, /@media \(min-width: 1101px\) and \(pointer: fine\)/);
  assert.match(desktop, /height: 100dvh/);
  assert.match(desktop, /\.in-match > \.arenaWrap\s*\{[^}]*max-height: calc\(100dvh - 215px\)/s);
  assert.match(desktop, /\.in-match > \.arenaWrap\s*\{[^}]*aspect-ratio: 8 \/ 5/s);
  assert.match(desktop, /\.in-match > \.abilities\s*\{[^}]*margin: 0/s);
  assert.match(desktop, /max-width: 700px/);
});

test("duplicate top-level tutorial launch is removed while guided entry remains", () => {
  assert.doesNotMatch(ui, /className="tutorial-launch"/);
  assert.match(ui, /className="first-tutorial"/);
  assert.match(ui, /onClick=\{\(\) => join\(true, false, false, true\)\}/);
  assert.match(css, /\.join-card \.practice-level \{ display: block; margin-top: 18px; \}/);
});

test("rotation suggestion is dismissible and only styled for portrait mobile", () => {
  assert.match(ui, /Rotate for a bigger view/);
  assert.match(ui, /setRotateHintDismissed\(true\)/);
  assert.match(ui, /rift-rotate-hint/);
  const desktop = css.slice(css.lastIndexOf("/* Portrait-only optional hint."));
  assert.match(desktop, /@media \(orientation: portrait\) and \(max-width: 700px\)/);
});
