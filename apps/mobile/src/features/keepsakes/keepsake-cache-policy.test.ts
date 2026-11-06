import assert from "node:assert/strict";
import test from "node:test";

import { loadWithKeepsakeCache } from "./keepsake-cache-policy";

test("persists and returns the fresh cloud collection", async () => {
  const saved: string[][] = [];
  const result = await loadWithKeepsakeCache({
    loadRemote: async () => ["cloud"],
    loadCached: async () => ["old"],
    saveCached: async (items) => { saved.push(items); },
  });

  assert.deepEqual(result, { items: ["cloud"], stale: false });
  assert.deepEqual(saved, [["cloud"]]);
});

test("a full cache disk must not replace fresh cloud data with an older snapshot", async () => {
  let cacheReads = 0;
  const result = await loadWithKeepsakeCache({
    loadRemote: async () => ["new-photo-and-title"],
    loadCached: async () => { cacheReads++; return ["old-photo-and-title"]; },
    saveCached: async () => { throw new Error("disk full"); },
  });
  assert.deepEqual(result, { items: ["new-photo-and-title"], stale: false });
  assert.equal(cacheReads, 0);
});

test("a confirmed empty cloud collection stays empty even when cache persistence fails", async () => {
  const result = await loadWithKeepsakeCache({
    loadRemote: async () => [] as string[],
    loadCached: async () => ["archived-old-item"],
    saveCached: async () => { throw new Error("disk full"); },
    fallback: ["pending-local"],
  });
  assert.deepEqual(result, { items: [], stale: false });
});

test("a corrupt cache does not hide the separately durable pending outbox", async () => {
  const result = await loadWithKeepsakeCache({
    loadRemote: async () => { throw new Error("offline"); },
    loadCached: async () => { throw new Error("corrupt cache"); },
    saveCached: async () => undefined,
    fallback: ["pending-local-photo"],
  });
  assert.deepEqual(result, { items: ["pending-local-photo"], stale: true });
});

test("with no usable cache or fallback, preserve the original remote failure", async () => {
  const offline = new Error("offline source");
  await assert.rejects(loadWithKeepsakeCache({
    loadRemote: async () => { throw offline; },
    loadCached: async () => { throw new Error("corrupt cache"); },
    saveCached: async () => undefined,
  }), error => error === offline);
});

test("returns the owner-scoped cache when the cloud is unreachable", async () => {
  const result = await loadWithKeepsakeCache({
    loadRemote: async () => { throw new Error("offline"); },
    loadCached: async () => ["cached-cloud"],
    saveCached: async () => { throw new Error("must not write"); },
  });

  assert.deepEqual(result, { items: ["cached-cloud"], stale: true });
});

test("does not hide the network error before any cache exists", async () => {
  await assert.rejects(
    loadWithKeepsakeCache({
      loadRemote: async () => { throw new Error("offline"); },
      loadCached: async () => null,
      saveCached: async () => undefined,
    }),
    /offline/,
  );
});

test("returns a durable local outbox when cloud and cache are unavailable", async () => {
  const result = await loadWithKeepsakeCache({
    loadRemote: async () => { throw new Error("offline"); },
    loadCached: async () => null,
    saveCached: async () => undefined,
    fallback: ["pending-local"],
  });

  assert.deepEqual(result, { items: ["pending-local"], stale: true });
});
