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

test("fresh metadata suppresses old photo hydration even while cache persistence is held", async () => {
  const media = deferred<string[]>(); const save = deferred<void>(); const snapshots: string[][] = [];
  const loader = { remote: async () => [], cached: async () => ["deleted receipt"], save: () => save.promise,
    onCached: (rows: string[]) => snapshots.push(rows), hydrateCached: () => media.promise };
  const result = loadReceiptGallery("A", loader); await tick();
  media.resolve(["deleted receipt photo"]); await tick();
  assert.deepEqual(snapshots, [["deleted receipt"]]);
  save.resolve(); assert.deepEqual(await result, { rows: [], stale: false });
});

test("offline failure keeps the same owner's metadata and never replaces it with another invocation", async () => {
  const remoteA = deferred<string[]>(); const remoteB = deferred<string[]>();
  const mediaA = deferred<string[]>(); const mediaB = deferred<string[]>();
  const seenA: string[][] = []; const seenB: string[][] = [];
  const start = (owner: string, remote: ReturnType<typeof deferred<string[]>>, media: ReturnType<typeof deferred<string[]>>, seen: string[][]) =>
    loadReceiptGallery(owner, { remote: () => remote.promise, cached: async () => [owner], save: async () => {},
      onCached: rows => seen.push(rows), hydrateCached: async requested => { assert.equal(requested, owner); return media.promise; } });
  const a = start("A", remoteA, mediaA, seenA); const b = start("B", remoteB, mediaB, seenB);
  await tick(); mediaB.resolve(["B image"]); mediaA.resolve(["A image"]); await tick();
  assert.deepEqual(seenA, [["A"], ["A image"]]); assert.deepEqual(seenB, [["B"], ["B image"]]);
  remoteA.reject(new Error("offline")); remoteB.reject(new Error("offline"));
  assert.deepEqual(await a, { rows: ["A"], stale: true }); assert.deepEqual(await b, { rows: ["B"], stale: true });
});
