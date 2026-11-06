import assert from "node:assert/strict";
import test from "node:test";
const modulePath = "./subscription-form";
const fields = { title: " Internet ", amount: "250000", nextDueDate: "2028-02-29", cadence: "monthly", alertDays: "3", note: " My own note ", walletId: "", categoryId: "" };

test("recurring payment form rejects normalized dates, excessive money and invalid reminder days", async () => {
  const { parseSubscriptionForm } = await import(modulePath);
  for (const nextDueDate of ["2026-02-31", "2026-02-29", "2026-13-01", "2026-1-01"]) assert.deepEqual(parseSubscriptionForm({ ...fields, nextDueDate }), { error: "invalidDate" });
  for (const amount of ["9000000000001", "0", "1.5", "12abc"]) assert.deepEqual(parseSubscriptionForm({ ...fields, amount }), { error: "invalidAmount" });
  for (const alertDays of ["-1", "366", "1.5", "3abc", ""]) assert.deepEqual(parseSubscriptionForm({ ...fields, alertDays }), { error: "invalidAlertDays" });
  assert.deepEqual(parseSubscriptionForm({ ...fields, title: " " }), { error: "titleRequired" });
  assert.deepEqual(parseSubscriptionForm({ ...fields, note: "x".repeat(2001) }), { error: "noteTooLong" });
  assert.deepEqual(parseSubscriptionForm({ ...fields, cadence: "unknown" }), { error: "invalidCadence" });
});

test("recurring payment payload preserves user data and maps supported cycles without changing the calendar date", async () => {
  const { parseSubscriptionForm } = await import(modulePath);
  for (const [cadence, cycleMonths] of [["weekly", 1], ["monthly", 1], ["quarterly", 3], ["yearly", 12]]) {
    for (const alertDays of ["0", "365"]) {
      const parsed = parseSubscriptionForm({ ...fields, cadence, alertDays, walletId: "wallet-1", categoryId: "category-1" });
      assert.deepEqual(parsed, { value: { title: "Internet", amount: 250000, nextDueAt: new Date(2028, 1, 29, 12).toISOString(), cadence, cycleMonths, alertDays: Number(alertDays), note: "My own note", walletId: "wallet-1", categoryId: "category-1" } });
    }
  }
  const parsed = parseSubscriptionForm(fields);
  assert.equal(parsed.value.walletId, null); assert.equal(parsed.value.categoryId, null);
});
