import assert from "node:assert/strict";
import test from "node:test";
import type { ReceiptRecord } from "@picket/domain";
import { forgetReceipts, recallReceipt, recallTransactionReceipt, rememberReceipt } from "./receipt-memory";

const receipt = { id: "r1", merchant: "GEARVN" } as ReceiptRecord;

test("a receipt read on the transaction screen opens instantly on the receipt screen", () => {
  forgetReceipts();
  rememberReceipt("owner-a", receipt);
  assert.equal(recallReceipt("owner-a", "r1")?.merchant, "GEARVN");
});

test("another account never sees a remembered receipt", () => {
  forgetReceipts();
  rememberReceipt("owner-a", receipt);
  assert.equal(recallReceipt("owner-b", "r1"), null);
});

test("a list row never replaces a receipt that already has its line items", () => {
  forgetReceipts();
  const full = { id: "r2", version: 3, transactionId: "t2", lineItems: [{ id: "l1" }] } as unknown as ReceiptRecord;
  rememberReceipt("owner-a", full);
  rememberReceipt("owner-a", { id: "r2", version: 3, transactionId: "t2" } as ReceiptRecord);
  assert.equal(recallTransactionReceipt("owner-a", "t2")?.lineItems?.length, 1);
});
