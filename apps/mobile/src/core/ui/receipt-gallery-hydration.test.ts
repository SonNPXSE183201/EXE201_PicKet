import assert from "node:assert/strict";
import test from "node:test";
import { loadReceiptGallery } from "./receipt-gallery-policy";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test("cached photos hydrate while remote metadata is still unresolved", async () => {
  const remote = deferred<string[]>(); const media = deferred<string[]>();
  const snapshots: string[][] = []; const owners: string[] = [];
  const loader = { remote: () => remote.promise, cached: async () => ["cached metadata"], save: async () => {},
    onCached: (rows: string[]) => snapshots.push(rows),
    hydrateCached: async (owner: string) => { owners.push(owner); return media.promise; } };
  const result = loadReceiptGallery("A", loader);
  await tick(); assert.deepEqual(snapshots, [["cached metadata"]]);
  media.resolve(["cached photo"]); await tick();
  assert.deepEqual(snapshots, [["cached metadata"], ["cached photo"]]);
  assert.deepEqual(owners, ["A"]);
  remote.resolve(["fresh"]); assert.deepEqual(await result, { rows: ["fresh"], stale: false });
});

test("late cached hydration cannot overwrite an already completed fresh result", async () => {
  const media = deferred<string[]>(); const snapshots: string[][] = [];
  const loader = { remote: async () => ["fresh"], cached: async () => ["old metadata"], save: async () => {},
    onCached: (rows: string[]) => snapshots.push(rows), hydrateCached: () => media.promise };
  const result = await loadReceiptGallery("B", loader);
  assert.deepEqual(result.rows, ["fresh"]);
  media.resolve(["old photo"]); await tick();
  assert.deepEqual(snapshots, [["old metadata"]]);
});

test("failed image cache leaves metadata usable without unhandled rejection", async () => {
  const remote = deferred<string[]>(); const media = deferred<string[]>(); const snapshots: string[][] = [];
  const loader = { remote: () => remote.promise, cached: async () => ["usable"], save: async () => {},
    onCached: (rows: string[]) => snapshots.push(rows), hydrateCached: () => media.promise };
  const result = loadReceiptGallery("A", loader); await tick();
  media.reject(new Error("cache authentication failed")); await tick();
  remote.resolve(["fresh"]); assert.equal((await result).stale, false);
  assert.deepEqual(snapshots, [["usable"]]);
});

test("no metadata cache means no stale media hydration", async () => {
  let hydrated = false;
  const loader = { remote: async () => ["fresh"], cached: async () => null, save: async () => {},
    onCached: () => assert.fail("No cached rows"), hydrateCached: async () => { hydrated = true; return []; } };
  await loadReceiptGallery("A", loader); assert.equal(hydrated, false);
});
