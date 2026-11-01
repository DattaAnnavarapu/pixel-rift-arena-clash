import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { inviteUrl, qrMatrix, QR_SIZE, QR_MAX_BYTES } from "../src/invite-qr.js";

test("room invite encodes the exact same-origin public join URL", () => {
  assert.equal(
    inviteUrl("https://pixel-rift.onrender.com", "A1B2C3"),
    "https://pixel-rift.onrender.com/?room=A1B2C3",
  );
  assert.equal(
    inviteUrl("http://localhost:3000", "0AF123"),
    "http://localhost:3000/?room=0AF123",
  );
  assert.equal(
    inviteUrl("https://example.org", "A B"),
    "https://example.org/?room=A%20B",
  );
});

test("offline QR matrix matches a QR v5-L reference encoding", () => {
  const url = inviteUrl("https://pixel-rift.onrender.com", "A1B2C3");
  const matrix = qrMatrix(url);
  assert.ok(matrix);
  assert.equal(matrix.length, QR_SIZE);
  assert.ok(matrix.every((row) => row.length === QR_SIZE));
  const packed = matrix.flat().map((value) => (value ? "1" : "0")).join("");
  assert.equal(
    createHash("sha256").update(packed).digest("hex"),
    "66e6ad76038060a6eff5153d37a8067edbf3fd502710702b4ca0ab5801e96299",
  );
});

test("oversized links fail gracefully without sending any request", () => {
  assert.equal(qrMatrix("x".repeat(QR_MAX_BYTES + 1)), null);
  assert.ok(qrMatrix("x".repeat(QR_MAX_BYTES)));
});
