import assert from "node:assert/strict";
import test from "node:test";
import { ReconciliationJournal, type PendingReconciliation } from "./reconciliation-journal";

function fixture() {
  const rows = new Map<string, PendingReconciliation[]>();
  let next = 0;
  const store = {
    read: async (owner: string) => structuredClone(rows.get(owner) ?? []),
    write: async (owner: string, value: PendingReconciliation[]) => { rows.set(owner, structuredClone(value)); },
    newId: () => `request-${++next}`,
  };
  return { rows, store, journal: new ReconciliationJournal(store) };
}

test("same owner and payload reuse the persisted id after a new journal instance", async () => {
  const { journal, store } = fixture();
  const id = await journal.reserve("A", "payload");
  assert.equal(await new ReconciliationJournal(store).reserve("A", "payload"), id);
});

test("owners and changed payloads have independent ids without dropping uncertain requests", async () => {
  const { journal, rows } = fixture();
  const first = await journal.reserve("A", "one");
  assert.notEqual(await journal.reserve("B", "one"), first);
  assert.notEqual(await journal.reserve("A", "two"), first);
  assert.equal(await journal.reserve("A", "one"), first);
  assert.equal(rows.get("A")?.length, 2);
});

test("concurrent reservation returns one id and completion only removes its matching entry", async () => {
  const { journal, rows } = fixture();
  const [a, b] = await Promise.all([journal.reserve("A", "one"), journal.reserve("A", "one")]);
  assert.equal(a, b);
  await journal.reserve("A", "two");
  await journal.complete("A", "one", "stale-id");
  assert.equal(rows.get("A")?.length, 2);
  await journal.complete("A", "one", a);
  assert.equal(rows.get("A")?.length, 1);
  assert.notEqual(await journal.reserve("A", "one"), a);
});

test("storage failure rejects before caller can send a mutation and a later attempt recovers", async () => {
  const { store } = fixture();
  let fail = true;
  const journal = new ReconciliationJournal({ ...store, write: async (owner, rows) => {
    if (fail) throw new Error("disk full");
    await store.write(owner, rows);
  } });
  await assert.rejects(journal.reserve("A", "one"), /disk full/);
  fail = false;
  assert.ok(await journal.reserve("A", "one"));
});

test("failed cleanup keeps the old id for a safe retry", async () => {
  const { journal, store } = fixture();
  const id = await journal.reserve("A", "one");
  const failed = new ReconciliationJournal({ ...store, write: async () => { throw new Error("disk full"); } });
  await assert.rejects(failed.complete("A", "one", id));
  assert.equal(await journal.reserve("A", "one"), id);
});

test("corrupt storage and missing owner fail closed without overwriting", async () => {
  const { store } = fixture();
  let writes = 0;
  const journal = new ReconciliationJournal({ ...store, read: async () => [{ payload: "one", id: 12 }] as unknown as PendingReconciliation[], write: async () => { writes++; } });
  await assert.rejects(journal.reserve("A", "one"));
  await assert.rejects(journal.reserve("", "one"));
  assert.equal(writes, 0);
});

test("capacity never evicts an uncertain request and existing retries still work", async () => {
  const { journal } = fixture();
  const first = await journal.reserve("A", "0");
  for (let i = 1; i < 100; i++) await journal.reserve("A", String(i));
  await assert.rejects(journal.reserve("A", "overflow"));
  assert.equal(await journal.reserve("A", "0"), first);
});

test("lost response followed by restart reuses the server result instead of adding another adjustment", async () => {
  const { journal, store } = fixture();
  const serverResults = new Map<string, { difference: number }>();
  let adjustments = 0;
  const send = async (id: string, loseResponse: boolean) => {
    if (!serverResults.has(id)) { adjustments++; serverResults.set(id, { difference: 123 }); }
    if (loseResponse) throw new Error("response lost after commit");
    return serverResults.get(id)!;
  };
  const firstId = await journal.reserve("A", "same financial information");
  await assert.rejects(send(firstId, true));
  const restarted = new ReconciliationJournal(store);
  const retryId = await restarted.reserve("A", "same financial information");
  assert.deepEqual(await send(retryId, false), { difference: 123 });
  await restarted.complete("A", "same financial information", retryId);
  assert.equal(adjustments, 1);
  assert.equal(retryId, firstId);
});

test("concurrent different payloads preserve both durable entries", async () => {
  const { journal, rows } = fixture();
  await Promise.all([journal.reserve("A", "one"), journal.reserve("A", "two")]);
  assert.deepEqual(rows.get("A")?.map((row) => row.payload), ["one", "two"]);
});

test("pending requests can be listed after restart without mixing owners or mutating storage", async () => {
  const { journal, store } = fixture();
  const id = await journal.reserve("A", "one");
  await journal.reserve("B", "private-B");
  const restored = new ReconciliationJournal(store);
  const pending = await restored.list("A");
  assert.deepEqual(pending, [{ payload: "one", id }]);
  pending.length = 0;
  assert.equal((await restored.list("A")).length, 1);
});

test("a stale recovery button cannot create a new request after the old one completed", async () => {
  const { journal } = fixture();
  const id = await journal.reserve("A", "one");
  assert.equal(await journal.reserve("A", "one", id), id);
  await assert.rejects(journal.reserve("A", "one", "wrong-id"));
  await journal.complete("A", "one", id);
  await assert.rejects(journal.reserve("A", "one", id));
});
