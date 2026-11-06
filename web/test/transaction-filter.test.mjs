import test from "node:test";
import assert from "node:assert/strict";
import { filterTransactions } from "../src/core/finance/transaction-filter.ts";
const rows = [
  {
    id: "1",
    title: "Cà phê",
    note: "Quận 1",
    kind: "expense",
    accountId: "a",
    categoryId: "food",
    occurredAt: "2026-09-30T18:00:00Z",
    deletedAt: null,
  },
  {
    id: "2",
    title: "Lương",
    note: "",
    kind: "income",
    accountId: "b",
    occurredAt: "2026-10-02T00:00:00Z",
    deletedAt: null,
  },
  {
    id: "3",
    title: "Cà phê",
    kind: "expense",
    occurredAt: "2026-10-01T00:00:00Z",
    deletedAt: "2026-10-02",
  },
];
test("search is accent insensitive and excludes archived rows", () =>
  assert.deepEqual(
    filterTransactions(rows, { q: "ca phe" }).map((r) => r.id),
    ["1"],
  ));
test("date boundaries use Vietnam day and combine with wallet and kind", () => {
  assert.deepEqual(
    filterTransactions(rows, {
      from: "2026-10-01",
      to: "2026-10-01",
      account: "a",
      kind: "expense",
    }).map((r) => r.id),
    ["1"],
  );
  assert.deepEqual(
    filterTransactions(rows, { from: "2026-10-02", kind: "expense" }),
    [],
  );
});
