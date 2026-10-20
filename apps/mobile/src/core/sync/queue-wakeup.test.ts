import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createQueueWakeup } from "./finance-realtime-policy";

test("queue wakeup coalesces new writes and ignores notifications from its own active flush", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  const wake = createQueueWakeup(() => { calls++; });
  wake.request(1, false); wake.request(2, false);
  t.mock.timers.tick(349); assert.equal(calls, 0);
  t.mock.timers.tick(1); assert.equal(calls, 1);
  wake.request(2, true); wake.request(0, false);
  t.mock.timers.tick(1000); assert.equal(calls, 1);
  wake.dispose();
});

test("disposed owner wakeup cannot send a queued write after account switch", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  const wake = createQueueWakeup(() => { calls++; });
  wake.request(1, false); wake.dispose(); wake.request(1, false);
  t.mock.timers.tick(1000); assert.equal(calls, 0);
});

test("active sync wires queue enqueue, reconnect and bounded polling into flush", () => {
  const source = readFileSync(new URL("../../features/sync/sync-context.tsx", import.meta.url), "utf8");
  const queued = source.slice(source.indexOf("subscribeToMutationQueue(()"), source.indexOf("const subscription ="));
  assert.match(queued, /queueWake\.request/);
  assert.match(queued, /notifiedDuringFlush/);
  assert.match(source, /connection === "connected"/);
  assert.match(source, /queueWake\.dispose\(\)/);
  const polling = source.slice(source.indexOf("const remotePoll"), source.indexOf("return () => { clearTimeout(initialTimer)"));
  assert.match(polling, /flush\(\)/);
});
