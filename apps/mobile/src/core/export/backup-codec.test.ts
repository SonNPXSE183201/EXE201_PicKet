import assert from "node:assert/strict";
import test from "node:test";

import { openBackupEnvelope, sealBackupEnvelope } from "./backup-codec";

const password = "correct horse battery staple";
const salt = new Uint8Array(32).fill(7);
const nonce = new Uint8Array(12).fill(9);

test("backup codec round-trips a Flutter-compatible payload", async () => {
  const payload = { data: { entries: [], keepsakes: [] }, media: { "image:0": "/9j/" } };
  const encoded = await sealBackupEnvelope("picket-backup-v1", payload, password, salt, nonce);
  assert.deepEqual(await openBackupEnvelope(encoded, "picket-backup-v1", password), payload);
});

test("backup codec rejects a wrong password and tampering", async () => {
  const encoded = await sealBackupEnvelope("picket-guest-backup-v1", { value: 42 }, password, salt, nonce);
  await assert.rejects(openBackupEnvelope(encoded, "picket-guest-backup-v1", "wrong password"), /Sai mật khẩu/);
  const envelope = JSON.parse(encoded) as { ciphertext: string };
  envelope.ciphertext = `${envelope.ciphertext.slice(0, -2)}AA`;
  await assert.rejects(openBackupEnvelope(JSON.stringify(envelope), "picket-guest-backup-v1", password), /Sai mật khẩu/);
});

test("backup codec rejects invalid envelope dimensions and format", async () => {
  const encoded = await sealBackupEnvelope("picket-backup-v1", { value: 42 }, password, salt, nonce);
  await assert.rejects(openBackupEnvelope(encoded, "picket-guest-backup-v1", password), /Định dạng/);
  const envelope = JSON.parse(encoded) as { nonce: string };
  envelope.nonce = "AQ==";
  await assert.rejects(openBackupEnvelope(JSON.stringify(envelope), "picket-backup-v1", password), /không hợp lệ/);
});
