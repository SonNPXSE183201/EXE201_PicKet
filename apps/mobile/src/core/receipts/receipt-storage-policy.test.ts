import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { durableReceiptStoragePath } from "./receipt-storage-policy";

test("only a durable image in the exact owner namespace may be reused", () => {
  for (const path of [null, "A/ocr/job.jpg", "B/receipts/image.jpg", "A/receipts/../image.jpg", "A/receipts/sub/image.jpg", "A/receipts/image.jpg?token=secret", "https://example.com/image.jpg", "A/receipts/.jpg"]) {
    assert.equal(durableReceiptStoragePath("A", path), null);
  }
  for (const extension of ["jpg", "jpeg", "png", "webp", "JPG"]) {
    const path = `A/receipts/image-1.${extension}`;
    assert.equal(durableReceiptStoragePath("A", path), path);
  }
  assert.equal(durableReceiptStoragePath("../A", "../A/receipts/image.jpg"), null);
});

test("capture never hands a temporary OCR object to a permanent receipt", () => {
  const source = readFileSync(new URL("../../app/capture/index.tsx", import.meta.url), "utf8");
  const handoff = source.slice(source.indexOf("const draft = await savePendingReceiptDraft("));
  assert.match(handoff, /storagePath: null/);
  assert.doesNotMatch(handoff, /storagePath: fallbackStoragePath/);
});

test("saving a legacy draft reuploads OCR images into the durable receipt namespace", () => {
  const source = readFileSync(new URL("../../app/transactions/new.tsx", import.meta.url), "utf8");
  assert.match(source, /durableReceiptStoragePath\(session.user.id, draft.storagePath\)/);
});

test("receipt upload uses the durable draft identity and verifies ambiguous upload acknowledgements", () => {
  const upload = readFileSync(new URL("./receipt-upload.ts", import.meta.url), "utf8");
  assert.doesNotMatch(upload, /Crypto.randomUUID/);
  assert.match(upload, /uploadVerifiedFallbackImage/);
  assert.match(upload, /input.receiptId/);
  const source = readFileSync(new URL("../../app/transactions/new.tsx", import.meta.url), "utf8");
  assert.match(source, /receiptId: draft.id/);
});
