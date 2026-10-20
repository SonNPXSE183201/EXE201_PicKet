import assert from "node:assert/strict";
import test from "node:test";
import { emptyGuestFinance } from "../local/guest-finance";
import { validateGuestBackupPayload } from "./guest-backup-model";

test("guest backup accepts old payloads and preserves a valid receipt replay ledger", () => {
  const payload={finance:emptyGuestFinance(),keepsakes:[],receipts:[],media:{}};
  assert.equal(validateGuestBackupPayload(payload),payload);
  const withLedger={...payload,finance:{...payload.finance,receiptCreateIds:["capture-one"]}};
  assert.deepEqual(validateGuestBackupPayload(withLedger).finance,withLedger.finance);
});
test("guest backup rejects malformed, duplicate or oversized replay ledgers", () => {
  for (const receiptCreateIds of ["bad",null,[""],[2],[{}],["same","same"],["x".repeat(201)],new Array(50001).fill("too-many")]) {
    assert.throws(()=>validateGuestBackupPayload({finance:{...emptyGuestFinance(),receiptCreateIds},keepsakes:[],receipts:[],media:{}}));
  }
});
