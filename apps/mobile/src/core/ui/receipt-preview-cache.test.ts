import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as policy from "./receipt-gallery-policy";

type Row = { id: string; day: string; path?: string; thumbnailUri?: string };
type Preview = { path: string; thumbnailUri: string };
function hydrate(rows: Row[], previews: Preview[]) {
  const fn = Reflect.get(policy, "hydrateReceiptPreviews") as ((rows: Row[], previews: Preview[]) => Row[]);
  assert.equal(typeof fn, "function", "Missing small encrypted preview index");
  return fn(rows, previews);
}
const uri = "data:image/jpeg;base64,/9j/QA==";
test("small previews hydrate exact paths without carrying full images", () => {
  const original = [{ id: "a", day: "2026-10-01", path: "A/a.jpg" }, { id: "b", day: "2026-10-02", path: "A/new.jpg" }];
  const result = hydrate(original, [{ path: "A/a.jpg", thumbnailUri: uri }, { path: "A/old.jpg", thumbnailUri: uri }]);
  assert.equal(result[0].thumbnailUri, uri); assert.equal(result[1].thumbnailUri, undefined);
  assert.equal(Reflect.get(original[0], "thumbnailUri"), undefined);
  assert.equal(Reflect.has(result[0], "uri"), false);
});
test("oversized or invalid preview payloads are ignored and cannot become full image reads", () => {
  const rows = [{ id: "a", day: "2026-10-01", path: "A/a.jpg" }];
  for (const thumbnailUri of ["file:///foreign.jpg", "https://example.com/image", "data:image/jpeg;base64," + "a".repeat(131105)]) {
    assert.equal(hydrate(rows, [{ path: "A/a.jpg", thumbnailUri }])[0].thumbnailUri, undefined);
  }
});
test("calendar with all monthly previews returns before the full photo cache is read", () => {
  const source = readFileSync(new URL("../receipts/cloud-receipt-gallery.ts", import.meta.url), "utf8");
  const early = source.indexOf("monthly.every");
  assert.ok(early > 0, "Missing preview-only fast path");
  assert.ok(source.slice(early, source.indexOf("let images =", early)).includes("return"));
  assert.match(source, /"receipt-thumbnails"/);
  assert.match(source, /persistPreviews\(/);
});
test("full photo retrieval is lazy and scoped to the authenticated gallery owner", () => {
  const source = readFileSync(new URL("./home-receipt-calendar.tsx", import.meta.url), "utf8");
  assert.match(source, /<ReceiptGalleryPhoto/);
  const photo = readFileSync(new URL("../receipts/receipt-gallery-photo.tsx", import.meta.url), "utf8");
  assert.match(photo, /loadCloudReceiptImage\(owner/);
  assert.match(photo, /active = false/);
});
