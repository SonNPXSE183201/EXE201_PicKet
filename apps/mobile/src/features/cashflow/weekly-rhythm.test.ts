import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWeeklyRhythm } from "./weekly-rhythm";
const accounts = [{ id: "vnd", currencyCode: "VND", deletedAt: null }, { id: "usd", currencyCode: "USD", deletedAt: null }];
const entry = (id: string, occurredAt: string, amount: number, kind = "expense", accountId = "vnd") => ({ id, occurredAt, amount, kind, accountId, deletedAt: null });
const input = { accounts, transactions: [], currency: "VND", timeZone: "Asia/Ho_Chi_Minh", now: new Date("2026-10-28T05:00:00Z") };
test("local week starts Monday; future days are unknown rather than invented zero spending", () => {
  const result = buildWeeklyRhythm(input);
  assert.equal(result.start, "2026-10-26");
  assert.equal(result.today, "2026-10-28");
  assert.equal(result.days.length, 7);
  assert.equal(result.days[0].expense, 0);
  assert.equal(result.days[3].expense, null);
});
test("recorded spending respects timezone and currency; refunds and transfers stay separate", () => {
  const result = buildWeeklyRhythm({ ...input, transactions: [entry("a", "2026-10-25T18:00:00Z", 100), entry("b", "2026-10-26T04:00:00Z", 30, "refund"), entry("c", "2026-10-26T04:00:00Z", 900, "transfer"), entry("d", "2026-10-26T04:00:00Z", 20, "expense", "usd"), entry("e", "2026-10-28T06:00:00Z", 999)] });
  assert.equal(result.days[0].expense, 100);
  assert.equal(result.days[0].refunds, 30);
  assert.equal(result.recordCount, 2);
});
test("only closed days with prior records support a same-weekday comparison", () => {
  const result = buildWeeklyRhythm({ ...input, transactions: [entry("last", "2026-10-19T05:00:00Z", 120), entry("now", "2026-10-26T05:00:00Z", 40), entry("today", "2026-10-28T02:00:00Z", 70), entry("priorToday", "2026-10-21T02:00:00Z", 100)] });
  assert.equal(result.days[0].previousExpense, 120);
  assert.equal(result.days[2].previousExpense, null);
});
test("duplicate records, unsafe amounts, invalid dates and unknown wallet scopes fail visibly", () => {
  const row = entry("a", "2026-10-26T00:00:00Z", 40);
  for (const transactions of [[row, row], [{ ...row, amount: Number.MAX_SAFE_INTEGER }], [{ ...row, occurredAt: "broken" }], [{ ...row, accountId: "missing" }]]) assert.throws(() => buildWeeklyRhythm({ ...input, transactions }));
});
