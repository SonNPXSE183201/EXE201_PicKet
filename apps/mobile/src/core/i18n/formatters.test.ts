import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMoney, formatCalendarDate, normalizeLanguage } from "./formatters";

test("locale changes presentation without converting VND to another currency", () => {
  assert.match(formatMoney(123456, "en", "VND"), /123,456/);
  assert.match(formatMoney(123456, "vi", "VND"), /123\.456/);
  assert.equal(normalizeLanguage("en-US"), "en");
  assert.equal(normalizeLanguage("vi-VN"), "vi");
  assert.equal(normalizeLanguage("ja-JP"), "vi");
});
test("calendar dates never shift across timezone boundaries and invalid dates reject", () => {
  assert.equal(formatCalendarDate("2024-02-29", "en"), "02/29/2024");
  assert.equal(formatCalendarDate("2024-02-29", "vi"), "29/02/2024");
  assert.throws(() => formatCalendarDate("2023-02-29", "en"));
  assert.throws(() => formatMoney(NaN, "vi", "VND"));
});
