import assert from "node:assert/strict";
import test from "node:test";

const modulePath = "./bill-form";
test("bill validation rejects impossible calendar days and unsafe money before creating a payload", async () => {
  const { parseBillForm } = await import(modulePath);
  for (const dueDate of ["2026-02-29", "2026-02-31", "2026-04-31", "2026-13-01", "2026-00-01", "2026-01-00", "26-01-01", "2026-1-01", "invalid"]) {
    assert.deepEqual(parseBillForm({ title: "Electricity", amount: "100", dueDate }), { error: "invalidDate" });
  }
  for (const amount of ["0", "-1", "1.5", "1e3", "12abc", "", "9000000000001", "9007199254740992"]) {
    assert.deepEqual(parseBillForm({ title: "Electricity", amount, dueDate: "2026-10-25" }), { error: "invalidAmount" });
  }
});

test("bill payload preserves user text, accepts leap days and uses the selected local calendar date", async () => {
  const { parseBillForm, billDateInput, initialBillDueDate } = await import(modulePath);
  assert.deepEqual(parseBillForm({ title: "  Tiền điện / October  ", amount: "00100", dueDate: "2028-02-29" }), {
    value: { title: "Tiền điện / October", amount: 100, dueAt: new Date(2028, 1, 29, 12).toISOString() },
  });
  assert.deepEqual(parseBillForm({ title: "  ", amount: "1", dueDate: "2026-10-25" }), { error: "titleRequired" });
  assert.deepEqual(parseBillForm({ title: "x".repeat(161), amount: "1", dueDate: "2026-10-25" }), { error: "titleTooLong" });
  assert.equal(parseBillForm({ title: "Maximum", amount: "9000000000000", dueDate: "2026-10-25" }).value.amount, 9000000000000);
  const local = new Date(2026, 9, 31, 0, 15);
  assert.equal(initialBillDueDate(local), "2026-11-07");
  assert.equal(billDateInput(new Date(2026, 9, 25, 12).toISOString()), "2026-10-25");
  assert.equal(local.getDate(), 31);
});
