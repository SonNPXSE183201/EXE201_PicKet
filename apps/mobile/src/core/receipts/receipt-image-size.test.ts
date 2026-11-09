import assert from "node:assert/strict";
import test from "node:test";
import { receiptTargetSize, shouldOptimizeReceiptImage } from "./receipt-image-size";

test("a 12-megapixel portrait camera photo is reduced to a 2000px long side with its aspect ratio", () => {
  assert.deepEqual(receiptTargetSize(3000, 4000), { width: 1500, height: 2000 });
  assert.deepEqual(receiptTargetSize(4000, 3000), { width: 2000, height: 1500 });
});

test("photos already small enough are stored untouched", () => {
  assert.equal(receiptTargetSize(1080, 1920), null);
  assert.equal(receiptTargetSize(0, 0), null);
});

test("only JPEG photos are re-encoded so the stored extension stays truthful", () => {
  assert.equal(shouldOptimizeReceiptImage("file:///x/photo.jpg"), true);
  assert.equal(shouldOptimizeReceiptImage("file:///x/photo.JPEG"), true);
  assert.equal(shouldOptimizeReceiptImage("file:///x/scan.png"), false);
});
