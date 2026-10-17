import assert from "node:assert/strict";
import test from "node:test";

import { budgetOverview } from "./budget-overview";

const budget = { id:"budget-food", categoryId:"food", name:"Ăn uống", defaultLimit:100000, alertPercent:80, active:true, version:1, createdAt:"2026-09-01", updatedAt:"2026-09-01", deletedAt:null };
const expense = { id:"expense", title:"Bữa ăn", amount:60000, kind:"expense" as const, accountId:"cash", destinationAccountId:null, categoryId:"food", occurredAt:"2026-09-10", note:"", refundOfTransactionId:null, version:1, createdAt:"2026-09-10", updatedAt:"2026-09-10", deletedAt:null };

test("budget overview uses the transferred monthly limit instead of the default", () => {
  const result = budgetOverview(budget, "2026-09", [expense], 80000);
  assert.deepEqual(result, { limit:80000, spent:60000, remaining:20000, percent:75 });
});

test("budget overview counts a refund against its original expense category", () => {
  const refund = { ...expense, id:"refund", title:"Hoàn", kind:"refund" as const, categoryId:null, amount:10000, refundOfTransactionId:"expense", occurredAt:"2026-09-12" };
  const result = budgetOverview(budget, "2026-09", [expense, refund], null);
  assert.deepEqual(result, { limit:100000, spent:50000, remaining:50000, percent:50 });
});

test("budget overview ignores refunds from other months and handles zero period limit", () => {
  const refund = { ...expense, id:"refund", kind:"refund" as const, categoryId:null, amount:10000, refundOfTransactionId:"expense", occurredAt:"2026-10-01" };
  const result = budgetOverview(budget, "2026-09", [expense, refund], 0);
  assert.deepEqual(result, { limit:0, spent:60000, remaining:-60000, percent:0 });
});

test("budget overview allocates split expenses and partial refunds to each category", () => {
  const splitExpense = { ...expense, categoryId:null, amount:100000 };
  const refund = { ...expense, id:"refund", kind:"refund" as const, categoryId:null, amount:25000, refundOfTransactionId:"expense", occurredAt:"2026-09-12" };
  const splits = [{ id:"split-food", transactionId:"expense", categoryId:"food", amount:60000, version:1, createdAt:"2026-09-10", updatedAt:"2026-09-10", deletedAt:null }];
  const result = budgetOverview(budget, "2026-09", [splitExpense, refund], null, splits);
  assert.deepEqual(result, { limit:100000, spent:45000, remaining:55000, percent:45 });
});

test("budget overview uses actual refund splits when they differ from a simple proportion", () => {
  const splitExpense = { ...expense, categoryId:null, amount:100000 };
  const refund = { ...expense, id:"refund", kind:"refund" as const, categoryId:null, amount:20000, refundOfTransactionId:"expense", occurredAt:"2026-09-12" };
  const parts = [
    { id:"food-part", transactionId:"expense", categoryId:"food", amount:60000, version:1, createdAt:"2026-09-10", updatedAt:"2026-09-10", deletedAt:null },
    { id:"other-part", transactionId:"expense", categoryId:"other", amount:40000, version:1, createdAt:"2026-09-10", updatedAt:"2026-09-10", deletedAt:null },
    { id:"food-refund", transactionId:"refund", categoryId:"food", amount:11000, version:1, createdAt:"2026-09-12", updatedAt:"2026-09-12", deletedAt:null },
    { id:"other-refund", transactionId:"refund", categoryId:"other", amount:9000, version:1, createdAt:"2026-09-12", updatedAt:"2026-09-12", deletedAt:null },
  ];
  assert.equal(budgetOverview(budget,"2026-09",[splitExpense,refund],null,parts).spent,49000);
});
