import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { Budget, Transaction, TransactionSplit } from "@picket/domain";
import { budgetWarnings } from "./budget-warnings";

const expense = { id: "purchase", categoryId: "food", kind: "expense", amount: 1000, occurredAt: "2026-10-01", deletedAt: null } as Transaction;
const budget = { id: "food-budget", categoryId: "food", defaultLimit: 1000, alertPercent: 80, active: true } as Budget;
const input = { budgets: [budget], transactions: [expense], month: "2026-10", splits: [] as TransactionSplit[] };
const split = (id: string, transactionId: string, categoryId: string, amount: number): TransactionSplit => ({ id, transactionId, categoryId, amount, deletedAt: null } as TransactionSplit);

test("budget warnings subtract proportional refunds before applying the threshold", () => {
  const refund = { ...expense, id: "refund", kind: "refund", refundOfTransactionId: "purchase", amount: 300 } as Transaction;
  assert.deepEqual(budgetWarnings({ ...input, transactions: [expense, refund] }), []);
  assert.deepEqual(budgetWarnings(input).map(item => item.id), [budget.id]);
});

test("budget warnings allocate split purchases and explicit refund splits", () => {
  const travel = { ...budget, id: "travel-budget", categoryId: "travel", defaultLimit: 700 };
  const splits = [split("p1", "purchase", "food", 400), split("p2", "purchase", "travel", 600)];
  assert.deepEqual(budgetWarnings({ ...input, budgets: [budget, travel], splits }).map(item => item.id), [travel.id]);
  const refund = { ...expense, id: "refund", kind: "refund", refundOfTransactionId: "purchase", amount: 100 } as Transaction;
  assert.deepEqual(budgetWarnings({ ...input, budgets: [budget, travel], transactions: [expense, refund], splits: [...splits, split("r1", "refund", "travel", 100)] }), []);
});

test("period limits, inactive budgets and archived rows cannot create false warnings", () => {
  assert.deepEqual(budgetWarnings({ ...input, periodLimits: { [budget.id]: 1500 } }), []);
  assert.deepEqual(budgetWarnings({ ...input, periodLimits: { [budget.id]: 0 } }), []);
  assert.deepEqual(budgetWarnings({ ...input, budgets: [{ ...budget, active: false }] }), []);
  assert.deepEqual(budgetWarnings({ ...input, transactions: [{ ...expense, deletedAt: "2026-10-02" }] }), []);
});

test("previous-month original purchase only supplies the current refund allocation", () => {
  const refund = { ...expense, id: "refund", kind: "refund", refundOfTransactionId: "purchase", amount: 300 } as Transaction;
  assert.deepEqual(budgetWarnings({ ...input, transactions: [{ ...expense, occurredAt: "2026-09-01" }, refund] }), []);
});

test("both notification consumers wait for split and current-period limits", () => {
  for (const path of ["./reminder-coordinator.tsx", "../../app/notifications.tsx"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /useReminderPeriods/);
    assert.match(source, /splitLoading \|\| splitError \|\| !periodsReady/);
    assert.match(source, /periodLimits/);
  }
});
