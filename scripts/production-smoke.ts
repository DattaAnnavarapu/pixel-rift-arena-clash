import assert from "node:assert/strict";
import { createGameServer } from "../server/index.js";
import { RELEASE_VERSION, PROTOCOL_VERSION } from "../server/release.js";
process.env.NODE_ENV = "production";
const server = await createGameServer({ port: 0 });
try {
  const health = await fetch(server.url + "/health");
  assert.equal(health.status, 200);
  assert.equal(health.headers.get("x-content-type-options"), "nosniff");
  const body = await health.json();
  assert.equal(body.version, RELEASE_VERSION);
  assert.equal(body.protocol, PROTOCOL_VERSION);
  const home = await fetch(server.url);
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /Pixel Rift/);
  const asset = html.match(/src="(\/assets\/[^"\s]+\.js)"/);
  assert.ok(asset, "built JS asset missing");
  const js = await fetch(server.url + asset[1]);
  assert.equal(js.status, 200);
  assert.ok((await js.text()).length > 1000);
  const status = await (await fetch(server.url + "/api/status")).json();
  assert.equal(status.version, RELEASE_VERSION);
  assert.equal(status.online, 0);
  console.log(
    `Production smoke passed: v${RELEASE_VERSION}, protocol ${PROTOCOL_VERSION}, health, HTML and JS assets.`,
  );
} finally {
  await server.close();
}
