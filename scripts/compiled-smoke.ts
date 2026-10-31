import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { PROTOCOL_VERSION, RELEASE_VERSION } from "../server/release.js";
const child = spawn(process.execPath, ["build/server/start.js"], {
  env: { ...process.env, NODE_ENV: "production", PORT: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});
let errors = "";
child.stderr.on("data", (b) => (errors += b.toString()));
try {
  const url = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Compiled startup timeout: " + errors)),
      10000,
    );
    child.once("error", reject);
    child.once("exit", (code) => {
      clearTimeout(timer);
      if (code) reject(new Error(`Compiled server exit ${code}: ${errors}`));
    });
    child.stdout.on("data", (b) => {
      const match = b.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
  });
  const r = await fetch(url + "/health");
  const h = await r.json();
  assert.equal(h.protocol, PROTOCOL_VERSION);
  assert.equal(h.version, RELEASE_VERSION);
  assert.equal(h.ok, true);
  console.log(
    `Compiled production startup passed: ${h.version}, protocol ${h.protocol}`,
  );
} finally {
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 4000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
