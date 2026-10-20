import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("receipt submission pins the full encrypted request before the first cloud mutation", () => {
  const source = readFileSync(new URL("../../app/transactions/new.tsx", import.meta.url), "utf8");
  assert.match(source, /pinPendingReceiptRequest\(receiptDraft, request\)/);
  assert.ok(source.indexOf("pinPendingReceiptRequest(receiptDraft, request)") < source.indexOf("await uploadReceiptImage("));
  const storage = readFileSync(new URL("./pending-receipt.ts", import.meta.url), "utf8");
  assert.match(storage, /pending-receipt-request:/);
  assert.match(storage, /COALESCE\(transaction_request_payload/);
});
