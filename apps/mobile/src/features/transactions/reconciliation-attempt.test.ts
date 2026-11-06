import assert from "node:assert/strict";
import test from "node:test";
import { runReconciliationAttempt, isValidStatementDate, decodeReconciliationRequest } from "./reconciliation-attempt";

test("a refresh failure never changes a successful mutation into a write failure", async () => {
  let mutations = 0;
  const result = await runReconciliationAttempt(async () => { mutations++; return { difference: 123 }; }, async () => { throw new Error("network after commit"); });
  assert.deepEqual(result, { result: { difference: 123 }, refreshFailed: true });
  assert.equal(mutations, 1);
});
test("mutation failure propagates without refreshing and retry can reuse the request id", async () => {
  const ids: string[] = [];
  let refreshed = 0;
  const requestId = "stable-request";
  await assert.rejects(runReconciliationAttempt(async () => { ids.push(requestId); throw new Error("lost response"); }, async () => { refreshed++; }));
  const result = await runReconciliationAttempt(async () => { ids.push(requestId); return { difference: 0 }; }, async () => { refreshed++; });
  assert.deepEqual(ids, [requestId, requestId]);
  assert.equal(refreshed, 1);
  assert.equal(result.refreshFailed, false);
});
test("statement date rejects rolled-over calendar dates and future dates", () => {
  assert.equal(isValidStatementDate("2026-02-31", "2026-10-18"), false);
  assert.equal(isValidStatementDate("2026-02-29", "2026-10-18"), false);
  assert.equal(isValidStatementDate("2024-02-29", "2026-10-18"), true);
  assert.equal(isValidStatementDate("2026-10-19", "2026-10-18"), false);
  assert.equal(isValidStatementDate("bad", "2026-10-18"), false);
  assert.equal(isValidStatementDate("2026-10-18", "2026-10-18"), true);
});

const savedRequest = { accountId: "wallet-A", statementDate: "2026-10-18", statementBalance: -123, selectedTransactionIds: ["tx-2", "tx-1"], reason: "reason" };
test("recovery retains the exact selection and amount rather than using current form state", () => {
  assert.deepEqual(decodeReconciliationRequest(JSON.stringify(savedRequest)), savedRequest);
});
test("recovery rejects damaged or unexpected payloads without inventing financial values", () => {
  for (const payload of ["broken", "null", "[]", JSON.stringify({ ...savedRequest, statementDate: "2026-02-31" }), JSON.stringify({ ...savedRequest, statementBalance: 1.5 }), JSON.stringify({ ...savedRequest, statementBalance: 9_000_000_000_001 }), JSON.stringify({ ...savedRequest, selectedTransactionIds: ["tx", "tx"] }), JSON.stringify({ ...savedRequest, extra: true }), JSON.stringify({ ...savedRequest, reason: null })]) {
    assert.equal(decodeReconciliationRequest(payload), null);
  }
});
