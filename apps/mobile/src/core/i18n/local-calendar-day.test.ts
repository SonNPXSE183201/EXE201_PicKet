import assert from "node:assert/strict";
import { test } from "node:test";
import { localCalendarDay } from "./formatters";

test("localCalendarDay uses the device calendar at a UTC day boundary", () => {
  class BoundaryDate extends Date {
    constructor() { super("2026-09-30T18:00:00Z"); }
    override getFullYear() { return 2026; }
    override getMonth() { return 9; }
    override getDate() { return 1; }
  }
  const date = new BoundaryDate();
  assert.equal(date.toISOString().slice(0, 10), "2026-09-30");
  assert.equal(localCalendarDay(date), "2026-10-01");
});

test("localCalendarDay rejects an invalid clock value", () => {
  assert.throws(() => localCalendarDay(new Date(NaN)), /Invalid calendar date/);
});
