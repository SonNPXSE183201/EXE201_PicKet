import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("../src/app/(finance)/receipts/[id]/page.tsx", import.meta.url),
  "utf8",
);

test("receipt detail explains review-required state in an announced status", () => {
  assert.match(source, /receipt\.status === "review_required"/);
  assert.match(source, /role="status"/);
  assert.match(source, /Hóa đơn cần kiểm tra/);
  assert.match(source, /Hóa đơn đã được xác nhận/);
});
