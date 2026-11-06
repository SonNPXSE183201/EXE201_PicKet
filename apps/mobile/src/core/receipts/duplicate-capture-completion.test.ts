import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { completeDuplicateCapture } from "./duplicate-capture-completion";

test("opening an exact duplicate finishes its capture before navigating away", () => {
  const source = readFileSync(new URL("../../app/transactions/new.tsx", import.meta.url), "utf8");
  assert.match(source, /await completeDuplicateCapture\(/);
  assert.doesNotMatch(source, /if \(exact\) void removePendingReceiptDraft/);
});

test("exact duplicate completes capture before removal; probable match keeps edits", async () => {
  const calls: string[] = [];
  const io = { complete: async (owner: string, id: string) => { calls.push(owner+":"+id); }, remove: async () => { calls.push("remove"); } };
  const input = { exact: true, owner: "A", receiptOwner: "A", captureId: "capture" };
  await completeDuplicateCapture({ ...input, exact: false }, io); assert.deepEqual(calls, []);
  await completeDuplicateCapture(input, io); assert.deepEqual(calls, ["A:capture", "remove"]);
});
test("foreign owner and failed journal completion do not remove a pending draft", async () => {
  const io = { complete: async () => { throw Error("disk full"); }, remove: async () => assert.fail("Must remain retryable") };
  await assert.rejects(completeDuplicateCapture({ exact: true, owner: "B", receiptOwner: "A", captureId: "x" }, io), /owner changed/);
  await assert.rejects(completeDuplicateCapture({ exact: true, owner: "A", receiptOwner: "A", captureId: "x" }, io), /disk full/);
});
test("legacy draft with no capture ID is removable and cleanup failures stay visible", async () => {
  const input = { exact: true, owner: "A", receiptOwner: "A" };
  await assert.rejects(completeDuplicateCapture(input, { complete: async () => assert.fail("No capture ID"), remove: async () => { throw Error("cleanup failed"); } }), /cleanup failed/);
  let removed = false;
  await completeDuplicateCapture(input, { complete: async () => false, remove: async () => { removed = true; } });
  assert.equal(removed, true);
});
