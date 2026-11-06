import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyRestoredPurchases } from "./restore-results";

test("restore does not report success when verification fails or throws", async () => {
  const result = await verifyRestoredPurchases(["offline", "rejected"], async value => {
    if (value === "offline") throw new Error("network failure");
    return false;
  });
  assert.deepEqual(result, { verified: 0, failed: 2 });
});

test("restore retains successful verification while reporting partial failure", async () => {
  const result = await verifyRestoredPurchases(["owner-match", "owner-mismatch"], async value => value === "owner-match");
  assert.deepEqual(result, { verified: 1, failed: 1 });
});
