import { test } from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../server/index.js";

test("/ping is a lightweight response; health retains metrics", async () => {
  const server = await createGameServer({ port: 0, serveClient: false });
  try {
    const response = await fetch(server.url + "/ping");
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "pong");
    assert.match(response.headers.get("content-type") ?? "", /text\/plain/);
    const health = await (await fetch(server.url + "/health")).json();
    assert.ok(health.ok);
    assert.equal(typeof health.tickMs, "number");
    assert.equal(typeof health.memory.rss, "number");
  } finally {
    await server.close();
  }
});
