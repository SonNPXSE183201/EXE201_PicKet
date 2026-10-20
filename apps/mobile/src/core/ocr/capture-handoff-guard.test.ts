import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("camera handoff rejects parallel submission and stale generation finalizers", () => {
  const source = readFileSync(new URL("../../app/capture/index.tsx", import.meta.url), "utf8");
  const handoff = source.slice(source.indexOf("async function continueToTransaction()"), source.indexOf("if (!hydrated) return"));
  assert.match(handoff, /if \(isContinuing \|\| isRecognizing \|\| isQueueingFallback\) return/);
  assert.match(handoff, /generation === imageGeneration.current\) setIsContinuing\(false\)/);
  const rotate = source.slice(source.indexOf("async function rotateImage()"), source.indexOf("function confirmServerFallback()"));
  assert.match(rotate, /isQueueingFallback \|\| isContinuing/);
  assert.match(rotate, /generation === imageGeneration.current\) setIsRecognizing\(false\)/);
  const choose = source.slice(source.indexOf('async function choose('), source.indexOf('async function rotateImage()'));
  assert.match(choose, /if \(isContinuing \|\| isRecognizing \|\| isQueueingFallback\) return/);
});

test("a late server OCR result must not re-enable an attachment the user opted out of", () => {
  const source = readFileSync(new URL("../../app/capture/index.tsx", import.meta.url), "utf8");
  const completion = source.slice(source.indexOf('if (completed.status === "completed"'), source.indexOf('completed.status === "failed"'));
  assert.doesNotMatch(completion, /setAttachReceipt\(true\)/);
});
