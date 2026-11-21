import assert from "node:assert/strict";
import test from "node:test";

import { forecastMonthEnd, median, spendingPace, type ForecastInput } from "./month-forecast";

const wallet = { id: "w1", currencyCode: "VND", openingBalance: 0, archived: false, deletedAt: null };
let seq = 0;
const entry = (kind: string, amount: number, occurredAt: string, extra: Partial<{ accountId: string; destinationAccountId: string | null; deletedAt: string | null }> = {}) => ({
  id: `t${++seq}`, accountId: "w1", destinationAccountId: null, kind, amount, occurredAt, deletedAt: null, ...extra,
});
// Vietnam time: 17:00Z is midnight the next local day, so use 03:00Z (10:00 local).
const at = (day: string) => `${day}T03:00:00Z`;

/** Three months of a simple life: salary on the 25th, rent on the 1st, 100k food every day. */
function history(): ReturnType<typeof entry>[] {
  const rows: ReturnType<typeof entry>[] = [];
  for (const [year, month, days] of [[2026, 8, 31], [2026, 9, 30], [2026, 10, 31]] as const) {
    const mm = String(month).padStart(2, "0");
    rows.push(entry("income", 20_000_000, at(`${year}-${mm}-25`)));
    rows.push(entry("expense", 5_000_000, at(`${year}-${mm}-01`)));
    for (let day = 1; day <= days; day++) rows.push(entry("expense", 100_000, at(`${year}-${mm}-${String(day).padStart(2, "0")}`)));
  }
  // This month so far (1..20 November): rent + food.
  rows.push(entry("expense", 5_000_000, at("2026-11-01")));
  for (let day = 1; day <= 20; day++) rows.push(entry("expense", 100_000, at(`2026-11-${String(day).padStart(2, "0")}`)));
  return rows;
}

const base = (overrides: Partial<ForecastInput> = {}): ForecastInput => ({
  accounts: [{ ...wallet, openingBalance: 10_000_000 }],
  transactions: history(),
  currency: "VND",
  timeZone: "Asia/Ho_Chi_Minh",
  now: new Date("2026-11-20T10:00:00Z"),
  lookbackMonths: 3,
  minHistoryDays: 14,
  ...overrides,
});

test("median rounds the middle pair and handles empty input", () => {
  assert.equal(median([]), 0);
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([1, 2, 3, 4]), 3);
});

test("forecast carries salary and daily spending over the rest of the month without re-charging rent", () => {
  const result = forecastMonthEnd(base());
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.today, "2026-11-20");
  assert.equal(result.endDay, "2026-11-30");
  // Opening 10m + 3 salaries 60m − 3 rents 15m − 92 days food 9.2m = 45.8m, minus November 5m + 2m.
  assert.equal(result.balanceNow, 38_800_000);
  // Days 21–30 in past months: salary 20m, food 10 × 100k = 1m. Rent is on the 1st, already paid.
  assert.equal(result.remainingIncome, 20_000_000);
  assert.equal(result.remainingExpense, 1_000_000);
  assert.equal(result.expected, 38_800_000 + 19_000_000);
  assert.equal(result.low, result.expected);
  assert.equal(result.monthsUsed, 3);
  assert.equal(result.path.length, 11);
  assert.equal(result.path[0].expected, result.balanceNow);
  assert.equal(result.negativeDay, null);
  // Same pace as usual: rent + 20 days of food.
  assert.equal(result.spentSoFar, 7_000_000);
  assert.equal(result.typicalSpentSoFar, 7_000_000);
  assert.equal(spendingPace(result), 0);
});

test("a purchase scenario lowers every remaining day and can reveal a shortfall", () => {
  const plain = forecastMonthEnd(base({ accounts: [{ ...wallet, openingBalance: -37_000_000 }] }));
  assert.equal(plain.status, "ready");
  const withPurchase = forecastMonthEnd(base({ accounts: [{ ...wallet, openingBalance: -37_000_000 }], purchase: 3_000_000 }));
  if (plain.status !== "ready" || withPurchase.status !== "ready") return;
  assert.equal(withPurchase.expected, plain.expected - 3_000_000);
  assert.equal(withPurchase.purchase, 3_000_000);
  // Balance now 1.8m − 3m purchase is negative today; salary arrives on the 25th.
  assert.equal(withPurchase.negativeDay, "2026-11-20");
  assert.ok(withPurchase.lowest.expected < 0);
  assert.ok(withPurchase.expected > 0);
});

test("the range spans the months compared", () => {
  const rows = history();
  // A one-off 4m repair on 28 September widens the low end only.
  rows.push(entry("expense", 4_000_000, at("2026-09-28")));
  const result = forecastMonthEnd(base({ transactions: rows }));
  if (result.status !== "ready") throw new Error("expected ready");
  assert.equal(result.high - result.low, 4_000_000);
  assert.equal(result.expected, result.high);
});

test("not enough records: says how many days are needed instead of guessing", () => {
  const rows = [entry("expense", 50_000, at("2026-11-18")), entry("expense", 50_000, at("2026-11-19"))];
  const result = forecastMonthEnd(base({ transactions: rows }));
  assert.deepEqual(result, { status: "insufficient-history", month: "2026-11", today: "2026-11-20", historyDays: 2, neededDays: 14, monthsAvailable: 0 });
});

test("other currencies, deleted rows and internal transfers do not move the forecast", () => {
  const usd = { id: "w2", currencyCode: "USD", openingBalance: 500, archived: false, deletedAt: null };
  const savings = { id: "w3", currencyCode: "VND", openingBalance: 0, archived: false, deletedAt: null };
  const rows = [
    ...history(),
    entry("expense", 99, at("2026-10-26"), { accountId: "w2" }),
    entry("expense", 7_000_000, at("2026-10-26"), { deletedAt: "2026-10-27T00:00:00Z" }),
    entry("transfer", 2_000_000, at("2026-10-27"), { destinationAccountId: "w3" }),
  ];
  const plain = forecastMonthEnd(base());
  const result = forecastMonthEnd(base({ accounts: [{ ...wallet, openingBalance: 10_000_000 }, usd, savings], transactions: rows }));
  if (plain.status !== "ready" || result.status !== "ready") throw new Error("expected ready");
  assert.equal(result.balanceNow, plain.balanceNow);
  assert.equal(result.expected, plain.expected);
});

test("local days follow the profile time zone, not UTC", () => {
  // 16 November 18:00Z is already 17 November 01:00 in Vietnam.
  const rows = [...history(), entry("income", 1_000_000, "2026-10-21T18:00:00Z")];
  const result = forecastMonthEnd(base({ transactions: rows }));
  if (result.status !== "ready") throw new Error("expected ready");
  // 22 October local is inside the 21–30 window; only one of three months has it, median unchanged.
  assert.equal(result.high - result.expected, 1_000_000);
});

test("invalid scope and malformed records are rejected", () => {
  assert.throws(() => forecastMonthEnd(base({ currency: "vnd" })));
  assert.throws(() => forecastMonthEnd(base({ lookbackMonths: 0 })));
  assert.throws(() => forecastMonthEnd(base({ purchase: -1 })));
  assert.throws(() => forecastMonthEnd(base({ transactions: [entry("expense", 1.5, at("2026-11-01"))] })));
  assert.throws(() => forecastMonthEnd(base({ transactions: [entry("gift", 1, at("2026-11-01"))] })));
});
