import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { categorySpending } from "./category-spending";
import type { Transaction, TransactionSplit } from "@picket/domain";
const expense: Transaction = { id:"purchase", title:"Meal", accountId:"cash", destinationAccountId:null, categoryId:"food", kind:"expense", amount:1000, occurredAt:"2026-10-01", note:"", refundOfTransactionId:null, version:1, createdAt:"2026-10-01", updatedAt:"2026-10-01", deletedAt:null };
const parts: TransactionSplit[] = [{ id:"p1", transactionId:"purchase", categoryId:"food", amount:400, version:1,createdAt:"",updatedAt:"",deletedAt:null },{ id:"p2",transactionId:"purchase", categoryId:"travel",amount:600,version:1,createdAt:"",updatedAt:"",deletedAt:null }];
test("category report allocates split expense and proportional partial refund without changing net total", () => {
  const rows=[expense,{...expense,id:"refund",kind:"refund" as const,amount:100,refundOfTransactionId:"purchase"}];
  assert.deepEqual(categorySpending(rows,"2026-10",parts),[{id:"travel",amount:540},{id:"food",amount:360}]);
});
test("refund month uses original split; archived rows and transfers do not become spending", () => {
  const rows=[{...expense,occurredAt:"2026-09-01"},{...expense,id:"refund",kind:"refund" as const,amount:100,refundOfTransactionId:"purchase"},{...expense,id:"gone",deletedAt:"2026-10-02"},{...expense,id:"transfer",kind:"transfer" as const}];
  assert.deepEqual(categorySpending(rows,"2026-10",parts),[]);
});
test("uncategorized spending is preserved and split-loading failure cannot authorize month close", () => {
  assert.deepEqual(categorySpending([{...expense,categoryId:null}],"2026-10",[]),[{id:"uncategorized",amount:1000}]);
  const planning=readFileSync(new URL("../../app/planning.tsx",import.meta.url),"utf8");
  assert.match(planning,/useSpendingSplits/);
  assert.match(planning,/budgetOverview/);
  assert.match(planning,/splitLoading \|\| splitError/);
  assert.match(planning,/splitLoading \|\| splitError \? "—" : money\(spent\)/);
  assert.match(planning,/const refunds = monthly\.filter/);
  assert.match(planning,/const expense = grossExpense - refunds/);
  assert.match(readFileSync(new URL("../../app/insights.tsx",import.meta.url),"utf8"),/categorySpending/);
});

test("initial empty history cannot overwrite the last durable split snapshot before hydration", () => {
  const hook=readFileSync(new URL("../../features/transactions/use-spending-splits.ts",import.meta.url),"utf8");
  assert.match(hook,/if \(rows\.length > 0\) await writeOfflineCache/);
});
