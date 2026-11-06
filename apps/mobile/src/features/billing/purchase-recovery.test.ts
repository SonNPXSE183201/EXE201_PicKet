import assert from "node:assert/strict";
import test from "node:test";
import { createPurchaseRecovery } from "./purchase-recovery";

test("foreground resume rechecks purchases even after a recent empty catalogue", async () => {
  let calls = 0, now = 100;
  const recovery = createPurchaseRecovery(async () => { calls++; return true; }, () => now);
  await recovery.refresh(); now += 1000;
  await recovery.refresh(); assert.equal(calls, 1);
  await recovery.refresh(true); assert.equal(calls, 2);
});
test("resume during an in-flight read queues a fresh read instead of losing the purchase", async () => {
  let release!: () => void, calls = 0;
  const recovery = createPurchaseRecovery(async () => { calls++; if(calls===1) await new Promise<void>(done=>{release=done;}); return true; });
  const first = recovery.refresh(); await Promise.resolve();
  await recovery.refresh(true); release(); await first; assert.equal(calls, 2);
});
test("failed recovery stays retryable and disposal stops queued reads", async () => {
  let calls=0; const recovery=createPurchaseRecovery(async()=>{calls++;return false;});
  await recovery.refresh();await recovery.refresh();assert.equal(calls,2);recovery.stop();await recovery.refresh(true);assert.equal(calls,2);
});
