import assert from "node:assert/strict";
import { test } from "node:test";

import { filterTransactions } from "./filter-transactions";

const rows = [
  { id:"1", title:"Cà phê", note:"sáng", kind:"expense", accountId:"wallet-a", destinationAccountId:null, categoryId:"food", occurredAt:"2026-09-10T08:00:00Z" },
  { id:"2", title:"Lương", note:"", kind:"income", accountId:"wallet-b", destinationAccountId:null, categoryId:"salary", occurredAt:"2026-10-01T08:00:00Z" },
  { id:"3", title:"Chuyển ví", note:"", kind:"transfer", accountId:"wallet-b", destinationAccountId:"wallet-a", categoryId:null, occurredAt:"2026-10-02T08:00:00Z" },
];

test("filters by destination wallet and month", () => {
  assert.deepEqual(filterTransactions(rows, { accountId:"wallet-a", month:"2026-10" }).map((row) => row.id), ["3"]);
});

test("searches title, category name, and note without case sensitivity", () => {
  assert.deepEqual(filterTransactions(rows, { query:"ĐỒ UỐNG" }, { food:"Đồ uống" }).map((row) => row.id), ["1"]);
  assert.deepEqual(filterTransactions(rows, { query:"SÁNG" }).map((row) => row.id), ["1"]);
});

test("combines kind and category filters", () => {
  assert.deepEqual(filterTransactions(rows, { kind:"expense", categoryId:"salary" }), []);
});
