import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as delivery from "./budget-notice-delivery";

type Schedule = (id: string, current: () => boolean, io: { schedule(id: string): Promise<void>; cancel(id: string): Promise<void> }) => Promise<boolean>;
function policy(): Schedule {
  const result = Reflect.get(delivery, "scheduleOwnedReminder") as Schedule;
  assert.equal(typeof result, "function", "Missing post-schedule owner cancellation");
  return result;
}
test("owner change while OS schedule is pending cancels precisely the late request", async () => {
  const schedule = policy(); let current = true; let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; }); const calls: string[] = [];
  const operation = schedule("picket-A-bill-1", () => current, {
    schedule: async id => { calls.push("schedule:" + id); await held; },
    cancel: async id => { calls.push("cancel:" + id); },
  });
  current = false; release();
  assert.equal(await operation, false);
  assert.deepEqual(calls, ["schedule:picket-A-bill-1", "cancel:picket-A-bill-1"]);
});
test("inactive owner never schedules and an active owner keeps the reminder", async () => {
  const schedule = policy(); let sent = 0;
  const io = { schedule: async () => { sent++; }, cancel: async () => assert.fail("Unnecessary cancellation") };
  assert.equal(await schedule("A", () => false, io), false);
  assert.equal(await schedule("B", () => true, io), true); assert.equal(sent, 1);
});
test("OS rejection and late cancellation failure propagate rather than acknowledge success", async () => {
  const schedule = policy();
  await assert.rejects(schedule("A", () => true, { schedule: async () => { throw Error("OS rejected"); }, cancel: async () => {} }), /OS rejected/);
  let current = true;
  await assert.rejects(schedule("A", () => current, { schedule: async () => { current = false; }, cancel: async () => { throw Error("OS cancellation failed"); } }), /OS cancellation failed/);
});
test("native scheduling uses post-await owner cancellation and stops the old batch", () => {
  const source = readFileSync(new URL("./reminders.ts", import.meta.url), "utf8");
  assert.match(source, /scheduleOwnedReminder\(/);
  assert.match(source, /cancel:\s*identifier\s*=>\s*Notifications\.cancelScheduledNotificationAsync\(identifier\)/);
  assert.match(source, /if \(!scheduled\) return/);
});
