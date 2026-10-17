import assert from "node:assert/strict";
import test from "node:test";
import { calendarReceiptDay } from "./receipt-calendar";
test("calendar uses purchase date, then transaction date, then record date", () => {
  assert.equal(calendarReceiptDay({ purchasedAt: "2026-10-17T10:00:00+07:00", createdAt: "2026-10-18T10:00:00+07:00" }), "2026-10-17");
  assert.equal(calendarReceiptDay({ purchasedAt: null, createdAt: "2026-10-18T10:00:00+07:00" }, "2026-10-16T10:00:00+07:00"), "2026-10-16");
  assert.equal(calendarReceiptDay({ purchasedAt: null, createdAt: "invalid" }), null);
});
