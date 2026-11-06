import assert from "node:assert/strict";
import test from "node:test";
import { loadBudgetSplits } from "./load-budget-splits";

const base = { title:"Test", amount:100, kind:"expense" as const, accountId:"wallet", destinationAccountId:null, categoryId:null, occurredAt:"2026-10-01", note:"", refundOfTransactionId:null, version:1, createdAt:"2026-10-01", updatedAt:"2026-10-01", deletedAt:null };

test("loads each current expense and older refund source exactly once in bounded batches", async () => {
  const transactions = Array.from({length:27}, (_, index) => ({...base, id:`expense-${index}`}));
  transactions.push({...base, id:"old", occurredAt:"2026-09-01"});
  const refund = {...base, id:"refund", kind:"refund" as const, refundOfTransactionId:"old", occurredAt:"2026-10-02"};
  const batches: string[][] = [];
  await loadBudgetSplits([...transactions, refund], "2026-10", async (ids) => { batches.push(ids); return []; });
  assert.deepEqual(batches.map((batch) => batch.length), [25, 4]);
  assert.equal(batches.flat().filter((id) => id === "old").length, 1);
  assert.equal(batches.flat().filter((id) => id === "refund").length, 1);
});

test("does not issue a request for a month with no expenses", async () => {
  let calls = 0;
  assert.deepEqual(await loadBudgetSplits([], "2026-10", async () => { calls++; return []; }), []);
  assert.equal(calls, 0);
});
