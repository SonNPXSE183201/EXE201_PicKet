import assert from "node:assert/strict";
import test from "node:test";
import { indexReceiptImagePaths, indexReceiptThumbnailPaths, trimReceiptImages } from "./receipt-gallery-policy";

test("calendar thumbnail index never sends full receipt data to all day cells", () => {
  const items = [
    { id: "a", path: "A/one", dataUri: "full-one", thumbnailUri: "small-one", usedAt: 1 },
    { id: "b", path: "A/two", dataUri: "full-two", usedAt: 2 },
    { id: "c", path: "A/one", dataUri: "fresh-full", thumbnailUri: "fresh-small", usedAt: 3 },
  ];
  assert.deepEqual([...indexReceiptThumbnailPaths(items)], [["A/one", "fresh-small"]]);
  assert.equal(indexReceiptImagePaths(items).get("A/two"), "full-two", "Legacy full images remain available offline for the viewer");
});

test("receipt image budget includes thumbnail bytes and never evicts another owner's cache", () => {
  const items = [{ id: "a", path: "A/one", dataUri: "1234", thumbnailUri: "5678", usedAt: 1 }];
  assert.equal(trimReceiptImages(items, new Set(["a"]), 7).length, 0);
  assert.equal(trimReceiptImages(items, new Set(["a"]), 8).length, 1);
  assert.equal(items[0].thumbnailUri, "5678");
});
