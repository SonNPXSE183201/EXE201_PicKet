import assert from "node:assert/strict";
import test from "node:test";

import { applyGuestMutation, emptyGuestFinance, guestBudgetSpent } from "./guest-finance";

test("guest finance keeps wallet and transaction on device without a cloud session", () => {
  const wallet = { id: "wallet-1", name: "Tiền mặt", kind: "cash" as const, currencyCode: "VND", openingBalance: 100000, version: 1, createdAt: "2026-10-17T00:00:00Z", updatedAt: "2026-10-17T00:00:00Z", deletedAt: null, archived: false };
  const transaction = { id: "entry-1", title: "Ăn trưa", amount: 35000, kind: "expense" as const, accountId: wallet.id, destinationAccountId: null, categoryId: null, occurredAt: "2026-10-17T00:00:00Z", note: "", refundOfTransactionId: null, version: 1, createdAt: "2026-10-17T00:00:00Z", updatedAt: "2026-10-17T00:00:00Z", deletedAt: null };
  const withWallet = applyGuestMutation(emptyGuestFinance(), { type: "account.upsert", value: wallet });
  const withEntry = applyGuestMutation(withWallet, { type: "transaction.upsert", value: transaction });
  assert.equal(withEntry.accounts.length, 1);
  assert.equal(withEntry.transactions.length, 1);
  assert.equal(withWallet.transactions.length, 0);
  assert.equal(applyGuestMutation(withEntry, { type: "account.archive", id: wallet.id }).accounts.length, 0);
});

test("replacing local splits advances the parent transaction version", () => {
  const state = emptyGuestFinance();
  const transaction = { id: "entry-2", title: "Mua sắm", amount: 100000, kind: "expense" as const, accountId: "wallet-1", destinationAccountId: null, categoryId: null, occurredAt: "2026-10-17T00:00:00Z", note: "", refundOfTransactionId: null, version: 1, createdAt: "2026-10-17T00:00:00Z", updatedAt: "2026-10-17T00:00:00Z", deletedAt: null };
  const withEntry = applyGuestMutation(state, { type: "transaction.upsert", value: transaction });
  const updated = applyGuestMutation(withEntry, { type: "split.replace", transactionId: transaction.id, values: [] });
  assert.equal(updated.transactions[0].version, 2);
  assert.equal(withEntry.transactions[0].version, 1);
});

test("guest planning transfers limits without changing the total and closes a month once", () => {
  const initial = { ...emptyGuestFinance(), budgets: [
    { id: "food", categoryId: "c1", name: "Ăn uống", defaultLimit: 100000, alertPercent: 80, active: true, version: 1, createdAt: "2026-10-01", updatedAt: "2026-10-01", deletedAt: null },
    { id: "travel", categoryId: "c2", name: "Đi lại", defaultLimit: 50000, alertPercent: 80, active: true, version: 1, createdAt: "2026-10-01", updatedAt: "2026-10-01", deletedAt: null },
  ] };
  const moved = applyGuestMutation(initial, { type: "planning.transfer", month: "2026-09", sourceBudgetId: "food", destinationBudgetId: "travel", amount: 20000 });
  assert.equal(moved.planningPeriods["2026-09:food"], 80000);
  assert.equal(moved.planningPeriods["2026-09:travel"], 70000);
  const closed = applyGuestMutation(moved, { type: "planning.close", value: { month: "2026-09", closedAt: "2026-10-01", income: 0, expense: 0, note: "", rollover: false } });
  assert.throws(() => applyGuestMutation(closed, { type: "planning.transfer", month: "2026-09", sourceBudgetId: "food", destinationBudgetId: "travel", amount: 1 }));
  assert.throws(() => applyGuestMutation(closed, { type: "planning.close", value: closed.planningCloses["2026-09"] }));
});

test("guest reconciliation marks selected entries and creates one balancing adjustment", () => {
  const timestamp = "2026-10-17T00:00:00Z";
  const initial = { ...emptyGuestFinance(), accounts: [{ id: "cash", name: "Ví", kind: "cash" as const, currencyCode: "VND", openingBalance: 100000, archived: false, version: 1, createdAt: timestamp, updatedAt: timestamp, deletedAt: null }], transactions: [{ id: "spent", title: "Chi", amount: 20000, kind: "expense" as const, accountId: "cash", destinationAccountId: null, categoryId: null, occurredAt: timestamp, note: "", refundOfTransactionId: null, version: 1, createdAt: timestamp, updatedAt: timestamp, deletedAt: null }] };
  const next = applyGuestMutation(initial, { type: "reconcile.apply", id: "reconcile-1", accountId: "cash", statementDate: "2026-10-17", statementBalance: 90000, selectedTransactionIds: ["spent"], reason: "Điều chỉnh", occurredAt: timestamp });
  assert.equal(next.transactions.find((item) => item.id === "spent")?.reconciledAccountIds?.includes("cash"), true);
  assert.equal(next.transactions.find((item) => item.id === "reconcile-1")?.amount, 10000);
  assert.equal(applyGuestMutation(next, { type: "reconcile.apply", id: "reconcile-1", accountId: "cash", statementDate: "2026-10-17", statementBalance: 90000, selectedTransactionIds: ["spent"], reason: "Điều chỉnh", occurredAt: timestamp }).transactions.length, 2);
});

test("guest rejects edits to a closed month", () => {
  const timestamp = "2026-09-15T00:00:00Z";
  const transaction = { id: "old", title: "Cũ", amount: 10000, kind: "expense" as const, accountId: "cash", destinationAccountId: null, categoryId: null, occurredAt: timestamp, note: "", refundOfTransactionId: null, version: 1, createdAt: timestamp, updatedAt: timestamp, deletedAt: null };
  const closed = { ...emptyGuestFinance(), accounts: [{ id: "cash", name: "Ví", kind: "cash" as const, currencyCode: "VND", openingBalance: 100000, archived: false, version: 1, createdAt: timestamp, updatedAt: timestamp, deletedAt: null }], transactions: [transaction], planningCloses: { "2026-09": { month: "2026-09", closedAt: "2026-10-01", income: 0, expense: 10000, note: "", rollover: false } } };
  assert.throws(() => applyGuestMutation(closed, { type: "transaction.upsert", value: { ...transaction, amount: 20000 } }));
  assert.throws(() => applyGuestMutation(closed, { type: "transaction.archive", id: transaction.id }));
  assert.throws(() => applyGuestMutation(closed, { type: "reconcile.apply", id: "adjustment", accountId: "cash", statementDate: "2026-09-15", statementBalance: 0, selectedTransactionIds: [], reason: "Điều chỉnh", occurredAt: timestamp }));
});

test("guest month close carries unused budget into the next month", () => {
  const state = { ...emptyGuestFinance(), budgets: [{ id: "food", categoryId: "food-category", name: "Ăn", defaultLimit: 100000, alertPercent: 80, active: true, version: 1, createdAt: "2026-09-01", updatedAt: "2026-09-01", deletedAt: null }], transactions: [{ id: "meal", title: "Ăn", amount: 40000, kind: "expense" as const, accountId: "cash", destinationAccountId: null, categoryId: "food-category", occurredAt: "2026-09-10", note: "", refundOfTransactionId: null, version: 1, createdAt: "2026-09-10", updatedAt: "2026-09-10", deletedAt: null }] };
  const result = applyGuestMutation(state, { type: "planning.close", value: { month: "2026-09", closedAt: "2026-10-01", income: 0, expense: 40000, note: "", rollover: true } });
  assert.equal(result.planningPeriods["2026-10:food"], 160000);
});

test("guest cannot roll surplus into a month that was already closed", () => {
  const budget = { id:"food", categoryId:"food-category", name:"Ăn", defaultLimit:100000, alertPercent:80, active:true, version:1, createdAt:"2026-08-01", updatedAt:"2026-08-01", deletedAt:null };
  const state = { ...emptyGuestFinance(), budgets:[budget], planningCloses: { "2026-10": { month:"2026-10", closedAt:"2026-11-01", income:0, expense:0, note:"", rollover:false } } };
  assert.throws(() => applyGuestMutation(state, { type:"planning.close", value:{ month:"2026-09", closedAt:"2026-10-01", income:0, expense:0, note:"", rollover:true } }), /tháng sau đã chốt/i);
  assert.equal(state.planningPeriods["2026-10:food"], undefined);
});

test("guest rollover uses split spending net of partial refunds", () => {
  const budget = { id:"food", categoryId:"food-category", name:"Ăn", defaultLimit:100000, alertPercent:80, active:true, version:1, createdAt:"2026-09-01", updatedAt:"2026-09-01", deletedAt:null };
  const expense = { id:"purchase", title:"Mua", amount:100000, kind:"expense" as const, accountId:"cash", destinationAccountId:null, categoryId:null, occurredAt:"2026-09-10", note:"", refundOfTransactionId:null, version:1, createdAt:"2026-09-10", updatedAt:"2026-09-10", deletedAt:null };
  const refund = { ...expense, id:"refund", kind:"refund" as const, amount:20000, refundOfTransactionId:"purchase", occurredAt:"2026-09-11" };
  const state = { ...emptyGuestFinance(), budgets:[budget], transactions:[expense,refund], splits:{ purchase:[{ id:"part-food", transactionId:"purchase", categoryId:"food-category", amount:60000, version:1, createdAt:"2026-09-10", updatedAt:"2026-09-10", deletedAt:null }, { id:"part-other", transactionId:"purchase", categoryId:"other", amount:40000, version:1, createdAt:"2026-09-10", updatedAt:"2026-09-10", deletedAt:null }] } };
  const closed = applyGuestMutation(state, { type:"planning.close", value:{ month:"2026-09", closedAt:"2026-10-01", income:0, expense:80000, note:"", rollover:true } });
  assert.equal(closed.planningPeriods["2026-10:food"], 152000);
});

test("guest cannot transfer money already spent in the source budget", () => {
  const state = { ...emptyGuestFinance(), budgets: [
    { id: "food", categoryId: "food-category", name: "Ăn", defaultLimit: 100000, alertPercent: 80, active: true, version: 1, createdAt: "2026-09-01", updatedAt: "2026-09-01", deletedAt: null },
    { id: "travel", categoryId: "travel-category", name: "Đi", defaultLimit: 50000, alertPercent: 80, active: true, version: 1, createdAt: "2026-09-01", updatedAt: "2026-09-01", deletedAt: null },
  ], transactions: [{ id: "meal", title: "Ăn", amount: 90000, kind: "expense" as const, accountId: "cash", destinationAccountId: null, categoryId: "food-category", occurredAt: "2026-09-10", note: "", refundOfTransactionId: null, version: 1, createdAt: "2026-09-10", updatedAt: "2026-09-10", deletedAt: null }] };
  assert.throws(() => applyGuestMutation(state, { type: "planning.transfer", month: "2026-09", sourceBudgetId: "food", destinationBudgetId: "travel", amount: 20000 }));
});

test("guest planning counts split expense against its category budget", () => {
  const state = { ...emptyGuestFinance(), budgets: [
    { id:"food", categoryId:"food-category", name:"Ăn", defaultLimit:100000, alertPercent:80, active:true, version:1, createdAt:"2026-09-01", updatedAt:"2026-09-01", deletedAt:null },
    { id:"travel", categoryId:"travel-category", name:"Đi", defaultLimit:50000, alertPercent:80, active:true, version:1, createdAt:"2026-09-01", updatedAt:"2026-09-01", deletedAt:null },
  ], transactions: [{ id:"shopping", title:"Siêu thị", amount:100000, kind:"expense" as const, accountId:"cash", destinationAccountId:null, categoryId:null, occurredAt:"2026-09-10", note:"", refundOfTransactionId:null, version:1, createdAt:"2026-09-10", updatedAt:"2026-09-10", deletedAt:null }], splits:{ shopping:[{ id:"split-food", transactionId:"shopping", categoryId:"food-category", amount:90000, version:1, createdAt:"2026-09-10", updatedAt:"2026-09-10", deletedAt:null }, { id:"split-travel", transactionId:"shopping", categoryId:"travel-category", amount:10000, version:1, createdAt:"2026-09-10", updatedAt:"2026-09-10", deletedAt:null }] } };
  assert.throws(() => applyGuestMutation(state, { type:"planning.transfer", month:"2026-09", sourceBudgetId:"food", destinationBudgetId:"travel", amount:20000 }));
});

test("guest budget spending deducts a refund without its own category from the original split", () => {
  const expense = { id:"purchase", title:"Mua hàng", amount:100000, kind:"expense" as const, accountId:"cash", destinationAccountId:null, categoryId:null, occurredAt:"2026-09-10", note:"", refundOfTransactionId:null, version:1, createdAt:"2026-09-10", updatedAt:"2026-09-10", deletedAt:null };
  const refund = { ...expense, id:"refund", kind:"refund" as const, amount:20000, occurredAt:"2026-09-12", refundOfTransactionId:"purchase" };
  const budget = { id:"food-budget", categoryId:"food", name:"Ăn", defaultLimit:100000, alertPercent:80, active:true, version:1, createdAt:"2026-09-01", updatedAt:"2026-09-01", deletedAt:null };
  const state = { ...emptyGuestFinance(), budgets:[budget], transactions:[expense, refund], splits:{ purchase:[{ id:"part", transactionId:"purchase", categoryId:"food", amount:100000, version:1, createdAt:"2026-09-10", updatedAt:"2026-09-10", deletedAt:null }] } };
  assert.equal(guestBudgetSpent(state, budget, "2026-09"), 80000);
});
