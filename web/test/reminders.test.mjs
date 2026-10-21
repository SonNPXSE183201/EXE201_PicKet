import test from "node:test";
import assert from "node:assert/strict";
import { buildReminders } from "../src/core/finance/reminders.ts";
test("warranty and return reminders remain independent, paid and archived items are absent", () => {
  const result = buildReminders({
    today: "2026-10-22",
    month: "2026-10",
    bills: [
      { id: "paid", status: "paid", dueAt: "2026-10-24" },
      {
        id: "open",
        title: "Điện",
        status: "pending",
        dueAt: "2026-10-25",
        deletedAt: null,
      },
    ],
    subscriptions: [],
    keepsakes: [
      {
        id: "camera",
        title: "Máy ảnh",
        returnUntil: "2026-10-26",
        warrantyUntil: "2027-10-22",
        deletedAt: null,
      },
    ],
    warnings: [],
  });
  assert.deepEqual(result.map((r) => r.kind).sort(), [
    "bill",
    "return",
    "warranty",
  ]);
});
test("only active budget warnings are supplied and get a month-specific identity", () => {
  const result = buildReminders({
    today: "2026-10-22",
    month: "2026-10",
    bills: [],
    subscriptions: [],
    keepsakes: [],
    warnings: [{ id: "food", name: "Ăn uống" }],
  });
  assert.equal(result[0].id, "budget:food:2026-10");
  assert.equal(result[0].href, "/budgets");
});
