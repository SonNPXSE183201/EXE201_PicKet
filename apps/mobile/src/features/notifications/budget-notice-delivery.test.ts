import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("budget warnings have native delivery and owner cleanup wiring", () => {
  const source = readFileSync(new URL("./reminders.ts", import.meta.url), "utf8");
  assert.match(source, /budgetNoticeDelivery\.deliver/);
  assert.match(source, /getPresentedNotificationsAsync/);
  assert.match(source, /dismissNotificationAsync/);
});
