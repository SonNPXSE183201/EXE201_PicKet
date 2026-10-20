import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("cancelling the image picker preserves the existing OCR draft and fallback job", () => {
  const source = readFileSync(new URL("../../app/capture/index.tsx", import.meta.url), "utf8");
  const choose = source.slice(source.indexOf("async function choose("), source.indexOf("async function rotateImage("));
  const cancelled = choose.indexOf("if (result.canceled) return;");
  assert.ok(cancelled >= 0);
  for (const reset of ["pollingController.current?.abort()", "setFallbackStatus(null)", "setFallbackStoragePath(null)", "setLineItems([])"]) {
    assert.ok(choose.indexOf(reset) > cancelled, `${reset} must happen only after a successful selection`);
  }
});
