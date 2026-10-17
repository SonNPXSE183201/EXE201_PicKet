import assert from "node:assert/strict";
import test from "node:test";
import { loadReceiptGallery, trimReceiptImages } from "./receipt-gallery-policy";

test("persists fresh metadata and uses only the requested owner's cached gallery offline", async () => {
  const writes: string[] = [];
  const fresh = await loadReceiptGallery("A", { remote: async () => ["new"], cached: async () => ["old"], save: async (owner, rows) => { writes.push(owner + rows[0]); } });
  assert.deepEqual(fresh, { rows: ["new"], stale: false });
  assert.deepEqual(writes, ["Anew"]);
  const offline = await loadReceiptGallery("B", { remote: async () => { throw new Error("offline"); }, cached: async (owner) => owner === "B" ? ["B-only"] : ["A-only"], save: async () => {} });
  assert.deepEqual(offline, { rows: ["B-only"], stale: true });
});
test("does not turn an unreachable server with no cache into an empty gallery", async () => {
  await assert.rejects(loadReceiptGallery("A", { remote: async () => { throw new Error("offline"); }, cached: async () => null, save: async () => {} }));
});
test("cache persistence failure does not discard a successful remote gallery", async () => {
  const result = await loadReceiptGallery("A", { remote: async () => ["new"], cached: async () => null, save: async () => { throw new Error("disk full"); } });
  assert.deepEqual(result, { rows: ["new"], stale: false });
});
test("image cache is bounded, drops deleted receipts, and retains recently used images first", () => {
  const items = [{ id: "old", path: "a", dataUri: "1234", usedAt: 1 }, { id: "new", path: "b", dataUri: "5678", usedAt: 2 }, { id: "deleted", path: "c", dataUri: "x", usedAt: 3 }];
  assert.deepEqual(trimReceiptImages(items, new Set(["old", "new"]), 5).map((r) => r.id), ["new"]);
  assert.deepEqual(trimReceiptImages(items, new Set(), 20), []);
});

test("image cache keeps newest duplicate, skips oversized images and accepts an exact budget", () => {
  const items = [{ id: "same", path: "old", dataUri: "old", usedAt: 1 }, { id: "same", path: "new", dataUri: "new", usedAt: 3 }, { id: "huge", path: "x", dataUri: "123456789", usedAt: 4 }, { id: "fit", path: "y", dataUri: "ab", usedAt: 2 }];
  assert.deepEqual(trimReceiptImages(items, new Set(["same", "huge", "fit"]), 5).map((r) => [r.id, r.path]), [["same", "new"], ["fit", "y"]]);
  assert.deepEqual(trimReceiptImages(items, new Set(["same"]), 0), []);
  assert.equal(items.length, 4);
});
