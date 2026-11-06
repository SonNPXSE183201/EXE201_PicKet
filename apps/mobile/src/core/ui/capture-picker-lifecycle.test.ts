import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("cancelling the image picker preserves the existing OCR draft and fallback job", () => {
  const source = readFileSync(new URL("../../app/capture/index.tsx", import.meta.url), "utf8");
  const choose = source.slice(source.indexOf("async function choose("), source.indexOf("function confirmServerFallback("));
  const cancelled = choose.indexOf("if (result.canceled) return;");
  assert.ok(cancelled >= 0);
  assert.ok(choose.indexOf("await acceptImage(uri)") > cancelled);
  for (const reset of ["pollingController.current?.abort()", "setFallbackStatus(null)", "setFallbackStoragePath(null)", "setLineItems([])"]) assert.equal(choose.includes(reset), false, `${reset} belongs in the successful image-commit path, not before picker completion`);
  const accepted = source.slice(source.indexOf("async function acceptImage("), source.indexOf("async function runOcr("));
  assert.ok(accepted.indexOf("await captureJournal.save") > accepted.indexOf("await persistCaptureImage"));
});
