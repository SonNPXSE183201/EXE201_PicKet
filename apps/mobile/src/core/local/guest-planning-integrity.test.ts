import assert from "node:assert/strict";
import test from "node:test";
import { MAX_MONEY, type Budget, type Transaction, type TransactionSplit } from "@picket/domain";
import { budgetOverview } from "./budget-overview";
import { applyGuestMutation, emptyGuestFinance, guestBudgetSpent } from "./guest-finance";

const budget = (id = "food", categoryId = "food", defaultLimit = 100000): Budget => ({ id, categoryId, name: id, defaultLimit, alertPercent: 80, active: true, version: 1, createdAt: "2026-09-01", updatedAt: "2026-09-01", deletedAt: null });
const entry = (id: string, kind: Transaction["kind"], amount: number, patch: Partial<Transaction> = {}): Transaction => ({ id, kind, amount, title: id, accountId: "cash", destinationAccountId: null, categoryId: "food", occurredAt: "2026-09-10T12:00:00.000Z", note: "", refundOfTransactionId: null, version: 1, createdAt: "2026-09-10", updatedAt: "2026-09-10", deletedAt: null, ...patch });
const split = (id: string, transactionId: string, categoryId: string, amount: number, deletedAt: string | null = null): TransactionSplit => ({ id, transactionId, categoryId, amount, deletedAt, version: 1, createdAt: "2026-09-10", updatedAt: "2026-09-10" });
const close = (rollover = false) => ({ type: "planning.close" as const, value: { month: "2026-09", closedAt: "2026-10-01", income: 0, expense: 0, note: "Reviewed", rollover } });

test("guest allocations use explicit refund splits consistently for spending, transfers and rollover", () => {
  const state = { ...emptyGuestFinance(), budgets: [budget(), budget("travel", "travel")], transactions: [entry("purchase", "expense", 100000), entry("refund", "refund", 20000, { refundOfTransactionId: "purchase" })], splits: {
    purchase: [split("p-food", "purchase", "food", 60000), split("p-travel", "purchase", "travel", 40000)],
    refund: [split("r-food", "refund", "food", 11000), split("r-travel", "refund", "travel", 9000)],
  } };
  assert.equal(guestBudgetSpent(state, state.budgets[0], "2026-09"), 49000);
  assert.equal(guestBudgetSpent(state, state.budgets[1], "2026-09"), 31000);
  assert.throws(() => applyGuestMutation(state, { type: "planning.transfer", month: "2026-09", sourceBudgetId: "food", destinationBudgetId: "travel", amount: 51500 }));
  assert.equal(applyGuestMutation(state, close(true)).planningPeriods["2026-10:food"], 151000);
});

test("budget calculations exclude archived entries and splits and do not infer from deleted originals", () => {
  const rows = [entry("live", "expense", 50000), entry("deleted", "expense", 100000, { deletedAt: "2026-09-11" }), entry("deleted-refund", "refund", 10000, { refundOfTransactionId: "live", deletedAt: "2026-09-11" })];
  const parts = [split("old-allocation", "live", "food", 10000, "2026-09-11")];
  assert.equal(budgetOverview(budget(), "2026-09", rows, null, parts).spent, 50000);
  const original = entry("original", "expense", 100000, { occurredAt: "2026-08-10", deletedAt: "2026-09-01" });
  const refund = entry("refund", "refund", 20000, { refundOfTransactionId: "original" });
  assert.equal(budgetOverview(budget(), "2026-09", [original, refund], null).spent, 0);
  assert.equal(budgetOverview(budget(), "2026-09", [original, refund], null, [split("explicit", "refund", "food", 11000)]).spent, -11000);
});

test("proportional refund rounding stays exact inside the supported money range", () => {
  const original = entry("large", "expense", 8999999999999);
  const refund = entry("refund", "refund", 8999999999998, { refundOfTransactionId: "large" });
  const parts = [split("food-part", "large", "food", 4500000000000), split("other-part", "large", "travel", 4499999999999)];
  assert.equal(budgetOverview(budget(), "2026-09", [original, refund], null, parts).spent, 1);
});

test("guest month close derives totals from current live rows rather than a stale screen snapshot", () => {
  const state = { ...emptyGuestFinance(), transactions: [entry("salary", "income", 200000), entry("purchase", "expense", 100000), entry("refund", "refund", 20000, { refundOfTransactionId: "purchase" }), entry("transfer", "transfer", 90000), entry("deleted-income", "income", 999999, { deletedAt: "2026-09-11" }), entry("other-month", "income", 500000, { occurredAt: "2026-08-01" })] };
  const mutation = close();
  const result = applyGuestMutation(state, mutation).planningCloses["2026-09"];
  assert.equal(result.income, 200000); assert.equal(result.expense, 80000); assert.equal(result.note, "Reviewed");
  assert.equal(mutation.value.income, 0); assert.deepEqual(state.planningCloses, {});
});

test("guest planning rejects limits beyond the API cap and cannot transfer a negative source limit", () => {
  const state = { ...emptyGuestFinance(), budgets: [budget("food", "food", MAX_MONEY), budget("travel", "travel", MAX_MONEY)] };
  assert.throws(() => applyGuestMutation(state, { type: "planning.transfer", month: "2026-09", sourceBudgetId: "food", destinationBudgetId: "travel", amount: 1 }));
  assert.throws(() => applyGuestMutation(state, close(true)));
  const refunded = { ...state, budgets: [budget("food", "food", 10000), budget("travel", "travel")], transactions: [entry("original", "expense", 100000, { occurredAt: "2026-08-01" }), entry("refund", "refund", 20000, { refundOfTransactionId: "original" })] };
  assert.throws(() => applyGuestMutation(refunded, { type: "planning.transfer", month: "2026-09", sourceBudgetId: "food", destinationBudgetId: "travel", amount: 15000 }));
});

test("month close rejects invalid metadata and totals that cannot be represented exactly", () => {
  const state = emptyGuestFinance();
  assert.throws(() => applyGuestMutation(state, { ...close(), value: { ...close().value, note: "x".repeat(1001) } }));
  assert.throws(() => applyGuestMutation(state, { ...close(), value: { ...close().value, closedAt: "invalid" } }));
  const tooLarge = { ...state, transactions: Array.from({ length: 1001 }, (_, index) => entry(`salary-${index}`, "income", MAX_MONEY)) };
  assert.throws(() => applyGuestMutation(tooLarge, close())); assert.deepEqual(tooLarge.planningCloses, {});
});

test("a month can close at the exact UTC start of the next month", context => {
  context.mock.method(Date, "now", () => Date.parse("2026-10-01T00:00:00.000Z"));
  assert.equal(applyGuestMutation(emptyGuestFinance(), close()).planningCloses["2026-09"].month, "2026-09");
});
