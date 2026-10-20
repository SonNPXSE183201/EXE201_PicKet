import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("opening an exact duplicate finishes its capture before navigating away", () => {
  const source = readFileSync(new URL("../../app/transactions/new.tsx", import.meta.url), "utf8");
  assert.match(source, /await completeDuplicateCapture\(/);
  assert.doesNotMatch(source, /if \(exact\) void removePendingReceiptDraft/);
});
