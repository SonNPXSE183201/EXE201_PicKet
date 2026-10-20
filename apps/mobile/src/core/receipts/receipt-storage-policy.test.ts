import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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
