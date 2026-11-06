import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { calendarDate, shiftCalendarMonth, displayCalendarDate } from "./date-field-policy";

test("opening the date calendar blurs the money keyboard before mounting its modal", () => {
  const source=readFileSync(new URL("./date-field.tsx",import.meta.url),"utf8");
  assert.match(source,/onPress=\{\(\) => \{ Keyboard\.dismiss\(\);/);
});
test("calendar selects real local dates without UTC shifting or impossible day normalization", () => {
  assert.equal(calendarDate("2028-02",29),"2028-02-29");
  assert.throws(() => calendarDate("2026-02",29));
  assert.throws(() => calendarDate("2026-13",1));
  assert.equal(displayCalendarDate("2026-10-01"),"01/10/2026");
  assert.equal(displayCalendarDate(""),"Chọn ngày");
  assert.equal(shiftCalendarMonth("2026-12",1),"2027-01");
  assert.equal(shiftCalendarMonth("2026-01",-1),"2025-12");
});
