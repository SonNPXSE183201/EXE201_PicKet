import assert from "node:assert/strict";
import { test } from "node:test";
import { filterTransactions } from "./filter-transactions";
const row = (accountId: string, occurredAt: string, kind = "expense") => ({ title: "Test", note: "", kind, accountId, destinationAccountId: null, categoryId: null, occurredAt });
test("weekly drill-down filters the local day and selected currency together", () => {
  const rows = [row("vnd", "2026-10-25T18:00:00Z"), row("usd", "2026-10-25T18:00:00Z"), row("vnd", "2026-10-26T18:00:00Z"), row("vnd", "2026-10-25T18:00:00Z", "refund")];
  assert.deepEqual(filterTransactions(rows, { day: "2026-10-26", currency: "VND", kind: "expense", timeZone: "Asia/Ho_Chi_Minh" }, {}, { vnd: "VND", usd: "USD" }), [rows[0]]);
});
test("invalid or impossible day links cannot broaden the filter to all transactions", () => {
  for (const day of ["2026-02-30", "yesterday", "2026-13-01"]) assert.deepEqual(filterTransactions([row("vnd", "2026-10-26")], { day }), []);
});
