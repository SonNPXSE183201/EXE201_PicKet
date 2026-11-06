import assert from "node:assert/strict";
import { test } from "node:test";
import { createOwnerCacheLifecycle } from "./owner-cache-lifecycle";

function fixture() {
  const retired = new Set<string>();
  const rows = new Map<string, string>([["a", "private"], ["b", "other"], ["device-guest", "guest"]]);
  const driver = {
    isRetired: async (owner: string) => retired.has(owner),
    retire: async (owner: string) => { retired.add(owner); rows.delete(owner); },
    resume: async (owner: string) => { retired.delete(owner); },
  };
  return { retired, rows, driver, store: createOwnerCacheLifecycle(driver) };
}

test("retirement removes only the selected owner's cache and survives a new instance", async () => {
  const f = fixture();
  await f.store.retire("a");
  assert.equal(f.rows.has("a"), false);
  assert.equal(f.rows.get("b"), "other");
  assert.equal(f.rows.get("device-guest"), "guest");
  const restarted = createOwnerCacheLifecycle(f.driver);
  await assert.rejects(restarted.run("a", async () => f.rows.set("a", "late")), /retired/);
  await assert.rejects(restarted.run("a", async () => "read"), /retired/);
});

test("retirement drains dispatched writes and rejects queued writes from the previous generation", async () => {
  const f = fixture();
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const entered = new Promise<void>(resolve => { started = resolve; });
  const first = f.store.run("a", async () => { started(); await gate; f.rows.set("a", "first"); });
  await entered;
  const queued = f.store.run("a", async () => { f.rows.set("a", "queued"); });
  const rejected = assert.rejects(queued, /retired/);
  const retirement = f.store.retire("a");
  await assert.rejects(f.store.run("a", async () => {}), /retired/);
  release();
  await Promise.all([first, rejected, retirement]);
  assert.equal(f.rows.has("a"), false);
});

test("failed retirement is fail-closed, retryable, and never decrypts corrupt cached data", async () => {
  const f = fixture();
  let fail = true;
  const store = createOwnerCacheLifecycle({ ...f.driver, retire: async owner => {
    if (fail) throw Error("storage unavailable");
    await f.driver.retire(owner);
  } });
  await assert.rejects(store.retire("a"), /storage unavailable/);
  await assert.rejects(store.run("a", async () => { throw Error("decrypt corrupt data"); }), /retired/);
  fail = false;
  await store.retire("a");
  assert.equal(f.rows.has("a"), false);
});

test("explicit resume reopens an empty owner without reviving queued writes", async () => {
  const f = fixture();
  const stale = f.store.run("a", async () => { f.rows.set("a", "stale"); });
  const rejected = assert.rejects(stale, /retired/);
  const retired = f.store.retire("a");
  const resumed = f.store.resume("a");
  await Promise.all([rejected, retired, resumed]);
  assert.equal(f.rows.has("a"), false);
  await f.store.run("a", async () => { f.rows.set("a", "fresh"); });
  assert.equal(f.rows.get("a"), "fresh");
});

test("resume failure keeps the owner fenced and does not affect another owner", async () => {
  const f = fixture();
  const store = createOwnerCacheLifecycle({ ...f.driver, resume: async () => { throw Error("disk"); } });
  await store.retire("a");
  await assert.rejects(store.resume("a"), /disk/);
  await assert.rejects(store.run("a", async () => 1), /retired/);
  assert.equal(await store.run("b", async () => f.rows.get("b")), "other");
});

test("a failed ordinary operation does not poison subsequent work or another owner's queue", async () => {
  const f = fixture();
  await assert.rejects(f.store.run("a", async () => { throw Error("decode"); }), /decode/);
  assert.equal(await f.store.run("a", async () => 42), 42);
  await f.store.retire("a");
  assert.equal(await f.store.run("device-guest", async () => f.rows.get("device-guest")), "guest");
});

test("invalid owners cannot reach the persistence driver", async () => {
  const f = fixture();
  for (const owner of ["", " a", "a\n", "../a", "x".repeat(129)]) {
    await assert.rejects(f.store.run(owner, async () => 1), /owner/);
    await assert.rejects(f.store.retire(owner), /owner/);
    await assert.rejects(f.store.resume(owner), /owner/);
  }
  assert.equal(f.retired.size, 0);
});

test("interrupted deletion requires matching live verification before recovery and starts empty", async () => {
  const f = fixture(); await f.store.retire("a");
  const restarted = createOwnerCacheLifecycle(f.driver);
  assert.equal(await restarted.isRetired("a"), true);
  assert.equal(await restarted.recover("a", async () => "b", () => true), false);
  assert.equal(await restarted.recover("a", async () => null, () => true), false);
  assert.equal(await restarted.isRetired("a"), true);
  assert.equal(await restarted.recover("a", async () => "a", () => true), true);
  assert.equal(await restarted.isRetired("a"), false);
  assert.equal(await restarted.run("a", async () => f.rows.get("a")), undefined);
});

test("verification failure or a changed session cannot reopen a retired cache", async () => {
  const f = fixture(); await f.store.retire("a"); let current = true;
  await assert.rejects(f.store.recover("a", async () => { throw Error("offline"); }, () => true), /offline/);
  assert.equal(await f.store.recover("a", async () => { current = false; return "a"; }, () => current), false);
  assert.equal(await f.store.isRetired("a"), true);
  assert.equal(await f.store.recover("a", async () => { throw Error("must not verify"); }, () => false), false);
});

test("a new retirement wins against verification already in flight", {timeout: 2000}, async () => {
  const f = fixture(); await f.store.retire("a");
  let release!: () => void, started!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const recovery = f.store.recover("a", async () => { started(); await gate; return "a"; }, () => true);
  await entered;
  const retirement = f.store.retire("a"); release();
  assert.equal(await recovery, false); await retirement;
  assert.equal(await f.store.isRetired("a"), true);
});

test("successful recovery rejects writes queued before the verified recovery finishes", {timeout: 2000}, async () => {
  const f = fixture(); await f.store.retire("a");
  const restarted = createOwnerCacheLifecycle(f.driver);
  let release!: () => void, started!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const recovery = restarted.recover("a", async () => { started(); await gate; return "a"; }, () => true);
  await entered;
  const stale = assert.rejects(restarted.run("a", async () => f.rows.set("a", "stale")), /retired/);
  release(); assert.equal(await recovery, true); await stale;
  assert.equal(f.rows.has("a"), false);
});

test("explicit verification after a status-read error still checks the server even if no retirement marker exists", async () => {
  const f = fixture(); let calls = 0;
  assert.equal(await f.store.recover("a", async () => { calls++; return "b"; }, () => true), false);
  assert.equal(calls, 1);
  assert.equal(await f.store.recover("a", async () => "a", () => true), true);
  assert.equal(f.rows.get("a"), "private");
});
