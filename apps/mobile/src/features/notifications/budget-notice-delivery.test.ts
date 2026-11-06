import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createBudgetNoticeDelivery } from "./budget-notice-delivery";

test("budget warnings have native delivery and owner cleanup wiring", () => {
  const source = readFileSync(new URL("./reminders.ts", import.meta.url), "utf8");
  assert.match(source, /budgetNoticeDelivery\.deliver/);
  assert.match(source, /getPresentedNotificationsAsync/);
  assert.match(source, /dismissNotificationAsync/);
  const screen = readFileSync(new URL("../../app/notifications.tsx", import.meta.url), "utf8");
  assert.match(screen, /disabled=\{busy \|\| settingsLoading\}/);
});

function fixture() {
  const stored = new Map<string, string[]>(), shown: string[] = [];
  let failWrite = false, failShow = false;
  const delivery = createBudgetNoticeDelivery({
    read: async owner => stored.get(owner) ?? [],
    save: async (owner, ids) => { if (failWrite) throw new Error("disk full"); stored.set(owner, ids); },
    show: async (owner, id) => { if (failShow) throw new Error("OS rejected"); shown.push(owner + ":" + id); },
  });
  return { delivery, stored, shown, failWrite(value: boolean) { failWrite = value; }, failShow(value: boolean) { failShow = value; } };
}
const id = "budget:food:2026-10";
test("repeated/concurrent recalculation sends once per owner and month", async () => {
  const f = fixture();
  await Promise.all([f.delivery.deliver("A", [id,id]), f.delivery.deliver("A", [id])]);
  await f.delivery.deliver("B", [id]);
  await f.delivery.deliver("A", ["bill:skip", "budget:food:2026-11"]);
  assert.deepEqual(f.shown, ["A:"+id,"B:"+id,"A:budget:food:2026-11"]);
  const restarted = createBudgetNoticeDelivery({ read: async owner => f.stored.get(owner) ?? [], save: async () => {}, show: async () => assert.fail("Already delivered") });
  await restarted.deliver("A", [id]);
});
test("inactive owner does not deliver and an OS rejection remains retryable", async () => {
  const f = fixture(); await f.delivery.deliver("A", [id], () => false); assert.equal(f.shown.length,0);
  f.failShow(true); await assert.rejects(f.delivery.deliver("A", [id]));
  f.failShow(false); await f.delivery.deliver("A", [id]); assert.equal(f.shown.length,1);
});
test("failed ledger write is retried without showing again in the same process", async () => {
  const f = fixture(); f.failWrite(true); await assert.rejects(f.delivery.deliver("A", [id]));
  assert.equal(f.shown.length,1);
  f.failWrite(false); await f.delivery.deliver("A", [id]);
  assert.equal(f.shown.length,1); assert.deepEqual(f.stored.get("A"),[id]);
});
