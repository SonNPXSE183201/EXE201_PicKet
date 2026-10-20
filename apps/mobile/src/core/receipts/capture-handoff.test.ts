import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("reopening one capture uses the same pending receipt and transaction idempotency identity", () => {
  const source = readFileSync(new URL("../../app/capture/index.tsx", import.meta.url), "utf8");
  assert.match(source, /savePendingReceiptDraft\(\{\s*id: captureRef\.current\?\.id/);
  const pending = readFileSync(new URL("./pending-receipt.ts", import.meta.url), "utf8");
  assert.match(pending, /ON CONFLICT\(id\)/);
  assert.match(pending, /transaction_id IS NULL/);
});
