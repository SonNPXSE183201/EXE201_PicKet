import assert from "node:assert/strict";
import test from "node:test";

import { runBulkAction } from "./bulk-action";
import { OfflineQueuedError } from "../../core/sync/offline-queued-error";

test("processes every selected transaction and reports partial failures", async () => {
  const attempted: string[] = [];
  const result = await runBulkAction(["one", "two", "three"], async (id) => {
    attempted.push(id);
    if (id === "two") throw new Error("stale version");
  });

  assert.deepEqual(attempted, ["one", "two", "three"]);
  assert.deepEqual(result.completedIds, ["one", "three"]);
  assert.deepEqual(result.failedIds, ["two"]);
});

test("returns an empty result without invoking the action", async () => {
  let called = false;
  const result = await runBulkAction([], async () => { called = true; });
  assert.equal(called, false);
  assert.deepEqual(result, { completedIds: [], queuedIds: [], failedIds: [] });
});

test("separates durable offline writes from failures and retries only failed rows", async () => {
  const attempted: string[] = [];
  const first = await runBulkAction(["done", "queued", "conflict"], async (id) => {
    attempted.push(id);
    if (id === "queued") throw new OfflineQueuedError("transaction.archive");
    if (id === "conflict") throw new Error("version conflict");
  });
  assert.deepEqual(first, { completedIds: ["done"], queuedIds: ["queued"], failedIds: ["conflict"] });
  const second = await runBulkAction(first.failedIds, async (id) => { attempted.push(id); });
  assert.deepEqual(second.completedIds, ["conflict"]);
  assert.deepEqual(attempted, ["done", "queued", "conflict", "conflict"]);
});

test("does not process the same selected id twice", async () => {
  const attempted: string[] = [];
  await runBulkAction(["same", "same"], async (id) => { attempted.push(id); });
  assert.deepEqual(attempted, ["same"]);
});
