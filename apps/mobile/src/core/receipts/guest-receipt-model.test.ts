import assert from "node:assert/strict";
import test from "node:test";

import { makeGuestReceipt } from "./guest-receipt-model";

test("guest receipt keeps OCR details with its transaction and image", () => {
  const receipt = makeGuestReceipt({ transactionId:"entry", imageBase64:"/9j/", contentType:"image/jpeg", merchant:"Tiệm", amount:12000, purchasedAt:"2026-10-17", rawText:"Tiệm 12.000", lineItems:[] });
  assert.equal(receipt.transactionId, "entry");
  assert.equal(receipt.imageBase64, "/9j/");
});

test("guest receipt rejects unsupported image and invalid amount", () => {
  assert.throws(() => makeGuestReceipt({ transactionId:"entry", imageBase64:"AA==", contentType:"image/svg+xml", merchant:"Tiệm", amount:12000, purchasedAt:null, rawText:null, lineItems:[] }));
  assert.throws(() => makeGuestReceipt({ transactionId:"entry", imageBase64:"AA==", contentType:"image/png", merchant:"Tiệm", amount:0, purchasedAt:null, rawText:null, lineItems:[] }));
});
