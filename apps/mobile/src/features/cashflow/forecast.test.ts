import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateCashflow } from "./forecast";
test("confirmed cash flow excludes settled obligations and keeps purchase scenarios separate", () => {
  const input = { startDay: "2026-10-23", days: 7, currency: "VND", openingBalance: 1000000,
    occurrences: [{ id: "bill", day: "2026-10-24", amount: -300000, currency: "VND", settled: false }, { id: "paid", day: "2026-10-25", amount: -200000, currency: "VND", settled: true }] };
  const result = calculateCashflow(input, { day: "2026-10-26", amount: 400000 });
  assert.equal(result.baseline.at(-1)?.balance, 700000);
  assert.equal(result.scenario?.at(-1)?.balance, 300000);
  assert.equal(input.openingBalance, 1000000);
});
test("foreign currencies, duplicate occurrences and invalid days fail visibly", () => {
  const input = { startDay: "2026-10-23", days: 7, currency: "VND", openingBalance: 0, occurrences: [{ id: "x", day: "2026-10-24", amount: 100, currency: "USD", settled: false }] };
  assert.throws(() => calculateCashflow(input));
  assert.throws(() => calculateCashflow({ ...input, startDay: "2026-02-30", occurrences: [] }));
  assert.throws(() => calculateCashflow({ ...input, occurrences: [input.occurrences[0], input.occurrences[0]] }));
});
