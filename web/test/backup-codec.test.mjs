import test from "node:test";
import assert from "node:assert/strict";
import { pbkdf2Sync, createDecipheriv, createCipheriv } from "node:crypto";
import { sealBackup, openBackup } from "../src/core/finance/backup-codec.ts";
test("web .picket AES-GCM envelope is readable with the Expo PBKDF2 contract", async () => {
  const password = "Test-only password 2026",
    payload = { data: { entries: [] }, media: {} },
    encoded = await sealBackup(payload, password),
    e = JSON.parse(encoded);
  const key = pbkdf2Sync(
    password,
    Buffer.from(e.salt, "base64"),
    210000,
    32,
    "sha256",
  );
  const cipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(e.nonce, "base64"),
  );
  cipher.setAuthTag(Buffer.from(e.mac, "base64"));
  assert.deepEqual(
    JSON.parse(
      Buffer.concat([
        cipher.update(Buffer.from(e.ciphertext, "base64")),
        cipher.final(),
      ]).toString(),
    ),
    payload,
  );
  await assert.rejects(openBackup(encoded, "Wrong password"));
});
test("web opens an independently encrypted mobile-format fixture and rejects tampering", async () => {
  const password = "Test-only password 2026",
    salt = Buffer.alloc(32, 4),
    nonce = Buffer.alloc(12, 8),
    cipher = createCipheriv(
      "aes-256-gcm",
      pbkdf2Sync(password, salt, 210000, 32, "sha256"),
      nonce,
    ),
    payload = { data: { entries: [{ id: "old" }] }, media: {} };
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload)),
    cipher.final(),
  ]);
  const e = {
    format: "picket-backup-v1",
    salt: salt.toString("base64"),
    nonce: nonce.toString("base64"),
    mac: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  assert.deepEqual(await openBackup(JSON.stringify(e), password), payload);
  e.mac = Buffer.alloc(16).toString("base64");
  await assert.rejects(openBackup(JSON.stringify(e), password));
});
