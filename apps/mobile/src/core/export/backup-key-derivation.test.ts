import assert from "node:assert/strict";
import test from "node:test";
import { pbkdf2Sync } from "node:crypto";
import { configureNativeBackupKey, deriveBackupKey } from "./backup-key-derivation";

test("backup derivation preserves PBKDF2 parameters and accepts only 256-bit native output", async () => {
  const salt = new Uint8Array(32).fill(5), password = "Unicode backup mật khẩu 🔐";
  const expected = new Uint8Array(pbkdf2Sync(password, salt, 210_000, 32, "sha256"));
  assert.deepEqual(await deriveBackupKey(password, salt), expected);
  let calls = 0;
  try {
    configureNativeBackupKey(async (pass, bytes) => { assert.equal(pass, password); assert.deepEqual(bytes, salt); calls++; return expected; });
    assert.deepEqual(await deriveBackupKey(password, salt), expected);
    assert.equal(calls, 1);
    configureNativeBackupKey(async () => new Uint8Array(16));
    await assert.rejects(deriveBackupKey(password, salt));
  } finally { configureNativeBackupKey(null); }
});
