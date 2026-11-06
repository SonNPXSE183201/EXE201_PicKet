import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { createMutationQueueStore, eraseMutationQueueOwner, type QueueDatabase } from "./mutation-queue-store";
import { mutationQueueSchema } from "./mutation-queue-schema";
import { createOwnerCacheLifecycle } from "./owner-cache-lifecycle";

function fixture() {
  const raw = new DatabaseSync(":memory:"); raw.exec(mutationQueueSchema);
  const connection = {
    runAsync: async (sql: string, ...params: (string | number | null)[]) => raw.prepare(sql).run(...params),
    getFirstAsync: async <T>(sql: string, ...params: (string | number | null)[]): Promise<T | null> => (raw.prepare(sql).get(...params) ?? null) as T | null,
    getAllAsync: async <T>(sql: string, ...params: (string | number | null)[]): Promise<T[]> => raw.prepare(sql).all(...params) as T[],
  };
  const db: QueueDatabase = { ...connection, withExclusiveTransactionAsync: async operation => {
    raw.exec("BEGIN EXCLUSIVE");
    try { await operation(connection); raw.exec("COMMIT"); }
    catch (error) { raw.exec("ROLLBACK"); throw error; }
  } };
  const retired = new Set<string>(); let ids = 0;
  let beforeEncrypt: (owner: string) => Promise<void> = async () => {};
  const lifecycle = createOwnerCacheLifecycle({ isRetired: async owner => retired.has(owner), retire: async owner => { retired.add(owner); }, resume: async owner => { retired.delete(owner); } });
  const store = createMutationQueueStore({ database: async () => db,
    encrypt: async (payload, owner) => { await beforeEncrypt(owner); return `enc-v1:${owner}:${JSON.stringify(payload)}`; },
    decrypt: async <T>(payload: string, owner: string): Promise<T> => JSON.parse(payload.startsWith(`enc-v1:${owner}:`) ? payload.slice(`enc-v1:${owner}:`.length) : payload) as T,
    newId: () => `mutation-${++ids}`, notify: () => {},
    access: lifecycle.run,
  });
  const input = (owner: string) => ({ userId: owner, kind: "transaction.create" as const, payload: { request: { amount: 19 } }, entityKey: null, idempotencyKey: "request-key" });
  return { raw, db, lifecycle, store, input, pauseEncryption: (pause: typeof beforeEncrypt) => { beforeEncrypt = pause; } };
}

test("all outbox writers and legacy migration reads reject after owner retirement", async () => {
  const f = fixture();
  try {
    const row = await f.store.enqueueMutation(f.input("a"));
    const conflict = { ...row, reason: "version", failedAt: new Date().toISOString() };
    await f.lifecycle.retire("a");
    for (const operation of [
      () => f.store.enqueueMutation(f.input("a")),
      () => f.store.listPendingMutations("a"),
      () => f.store.listMutationConflicts("a"),
      () => f.store.removeMutation(row.id, "a"),
      () => f.store.markMutationRetry(row.id, "a"),
      () => f.store.moveMutationToConflict(row, "version"),
      () => f.store.retryMutationConflict(conflict, {}),
      () => f.store.removeMutationConflict(row.id, "a"),
      () => f.store.saveMutationEntityMapping("a", "client", "server", "account"),
      () => f.store.listMutationEntityMappings("a"),
    ]) await assert.rejects(operation(), /retired/);
    const other = await f.store.enqueueMutation(f.input("b"));
    assert.equal(other.userId, "b");
  } finally { f.raw.close(); }
});

test("retirement drains an in-flight encrypted outbox save and rejects queued stale retries before erasure", {timeout:2000}, async () => {
  const f = fixture(); let release!: () => void, started!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  f.pauseEncryption(async owner => { if (owner === "a") { started(); await gate; } });
  try {
    const writing = f.store.enqueueMutation(f.input("a")); await entered;
    const stale = assert.rejects(f.store.enqueueMutation(f.input("a")), /retired/);
    const retiring = f.lifecycle.retire("a").then(() => eraseMutationQueueOwner(f.db, "a"));
    await f.store.enqueueMutation(f.input("b"));
    release(); await writing; await Promise.all([stale, retiring]);
    assert.equal(f.raw.prepare("SELECT COUNT(*) AS count FROM pending_mutations WHERE user_id='a'").get()?.count, 0);
    assert.equal((await f.store.listPendingMutations("b")).length, 1);
  } finally { release?.(); f.raw.close(); }
});

test("foreign or already resolved conflict identities cannot replace another owner's pending row", async () => {
  const f = fixture();
  try {
    const row = await f.store.enqueueMutation(f.input("a"));
    await assert.rejects(f.store.moveMutationToConflict({ ...row, userId:"b" }, "wrong owner"), /owner|missing/);
    await f.store.moveMutationToConflict(row, "stale");
    const [conflict] = await f.store.listMutationConflicts("a");
    await assert.rejects(f.store.retryMutationConflict({ ...conflict, userId:"b" }, {}), /owner|missing/);
    await f.store.retryMutationConflict(conflict, { request: { amount:8 } });
    await assert.rejects(f.store.retryMutationConflict(conflict, {}), /owner|missing/);
    assert.equal((await f.store.listPendingMutations("a"))[0].userId,"a");
    assert.deepEqual((await f.store.listPendingMutations("a"))[0].payload.request,{amount:8});
    assert.equal((await f.store.listPendingMutations("b")).length, 0);
  } finally { f.raw.close(); }
});

test("retired outbox erasure removes pending rows, conflicts and mappings for one owner and is retryable", async () => {
  const f = fixture();
  try {
    for (const owner of ["a", "b", "device-guest"]) {
      const row = await f.store.enqueueMutation(f.input(owner));
      await f.store.moveMutationToConflict(row, "stale");
      await f.store.enqueueMutation(f.input(owner));
      await f.store.saveMutationEntityMapping(owner, "client", "server", "account");
    }
    await f.lifecycle.retire("a");
    f.raw.exec("CREATE TRIGGER fail_erasure BEFORE DELETE ON mutation_conflicts BEGIN SELECT RAISE(ABORT, 'disk failure'); END");
    await assert.rejects(eraseMutationQueueOwner(f.db, "a"), /disk failure/);
    assert.equal(f.raw.prepare("SELECT COUNT(*) AS count FROM pending_mutations WHERE user_id='a'").get()?.count, 1);
    f.raw.exec("DROP TRIGGER fail_erasure");
    await eraseMutationQueueOwner(f.db, "a"); await eraseMutationQueueOwner(f.db, "a");
    for (const table of ["pending_mutations", "mutation_conflicts", "mutation_entity_mappings"]) {
      assert.equal(f.raw.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id='a'`).get()?.count, 0);
      assert.equal(f.raw.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id='b'`).get()?.count, 1);
      assert.equal(f.raw.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id='device-guest'`).get()?.count, 1);
    }
    await assert.rejects(f.store.retryMutationConflict({ ...f.input("a"), id:"old", attempts:0, createdAt:"2026-10-25T00:00:00Z", failedAt:"2026-10-25T00:00:00Z",reason:"late" }, {}), /retired/);
  } finally { f.raw.close(); }
});

test("queue rows, conflicts, mappings, legacy migration and first-version merges preserve their owner", async () => {
  const f = fixture();
  try {
    const first = await f.store.enqueueMutation({ ...f.input("a"), kind: "transaction.update", entityKey: "tx", payload: { request: { expectedVersion: 3, description: "first" } } });
    const merged = await f.store.enqueueMutation({ ...f.input("a"), kind: "transaction.update", entityKey: "tx", payload: { request: { expectedVersion: 4, amount: 9 } } });
    assert.equal(merged.id, first.id);
    const [row] = await f.store.listPendingMutations("a");
    assert.deepEqual(row.payload.request, { expectedVersion: 3, description: "first", amount: 9 });
    await f.store.markMutationRetry(row.id, "b"); await f.store.removeMutation(row.id, "b");
    assert.equal((await f.store.listPendingMutations("a"))[0].attempts, 0);
    await f.store.moveMutationToConflict(row, "stale");
    assert.equal(await f.store.pendingMutationCount("a"), 0);
    const [conflict] = await f.store.listMutationConflicts("a");
    assert.equal(conflict.reason, "stale");
    await f.store.retryMutationConflict(conflict, { request: { amount: 7 } });
    assert.equal(await f.store.mutationConflictCount("a"), 0);
    await f.store.saveMutationEntityMapping("a", "local-wallet", "cloud-wallet", "account");
    assert.equal((await f.store.listMutationEntityMappings("a")).get("local-wallet"), "cloud-wallet");
    assert.equal((await f.store.listMutationEntityMappings("b")).size, 0);
    f.raw.prepare("UPDATE pending_mutations SET payload = ? WHERE user_id = ?").run(JSON.stringify({ request: { legacy: true } }), "a");
    assert.deepEqual((await f.store.listPendingMutations("a"))[0].payload, { request: { legacy: true } });
    assert.match(String(f.raw.prepare("SELECT payload FROM pending_mutations WHERE user_id = 'a'").get()?.payload), /^enc-v1:a:/);
  } finally { f.raw.close(); }
});
