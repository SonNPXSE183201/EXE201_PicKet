import assert from "node:assert/strict";
import { test } from "node:test";

import { loadAllTransactions } from "./load-all-transactions";

test("loads every page, including a short final page", async () => {
  const offsets: number[] = [];
  const rows = Array.from({ length: 205 }, (_, id) => ({ id }));
  const result = await loadAllTransactions(async ({ limit, offset }) => {
    offsets.push(offset);
    return rows.slice(offset, offset + limit);
  });
  assert.equal(result.length, 205);
  assert.deepEqual(offsets, [0, 100, 200]);
});

test("does not replace a complete history with an incomplete fetch", async () => {
  await assert.rejects(() => loadAllTransactions(async ({ offset }) => {
    if (offset === 0) return Array.from({ length: 100 }, (_, id) => ({ id }));
    throw new Error("network down");
  }), /network down/);
});

test("honors abort between pages", async () => {
  const controller = new AbortController();
  await assert.rejects(() => loadAllTransactions(async () => {
    controller.abort();
    return Array.from({ length: 100 }, (_, id) => ({ id }));
  }, controller.signal), /abort/i);
});
