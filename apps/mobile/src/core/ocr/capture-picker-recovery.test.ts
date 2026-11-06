import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import * as journal from "./capture-journal";

type Database = { execAsync(sql: string): Promise<void>; runAsync(sql: string, ...values: string[]): Promise<unknown>; getFirstAsync<T>(sql: string, ...values: string[]): Promise<T | null> };
type Store = { begin(owner: string, operation: string): Promise<void>; pending(owner: string): Promise<boolean>; complete(owner: string, operation: string): Promise<void> };
function create(db: DatabaseSync) {
  const factory = Reflect.get(journal, "createPickerRecoveryStore") as ((open: () => Promise<Database>) => Store) | undefined;
  assert.equal(typeof factory, "function", "Missing durable picker recovery store");
  return factory!(async () => ({
    execAsync: async sql => { db.exec(sql); },
    runAsync: async (sql, ...values) => db.prepare(sql).run(...values),
    getFirstAsync: async <T>(sql: string, ...values: string[]) => (db.prepare(sql).get(...values) ?? null) as T | null,
  }));
}
test("picker interruption survives a new store instance without adopting an image", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    await create(db).begin("owner-A", "operation-1");
    const restored = create(db);
    assert.equal(await restored.pending("owner-A"), true);
    assert.equal(await restored.pending("owner-B"), false);
    assert.deepEqual(Object.keys(db.prepare("SELECT * FROM capture_picker_attempts").get()!), ["owner_id", "operation_id"]);
  } finally { db.close(); }
});
test("normal completion clears only the exact owner's picker operation", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    const store = create(db); await store.begin("A", "one"); await store.begin("B", "two");
    await store.complete("A", "one");
    assert.equal(await store.pending("A"), false); assert.equal(await store.pending("B"), true);
  } finally { db.close(); }
});
test("an old picker completion cannot erase a newer interruption marker", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    const old = create(db), newer = create(db);
    await old.begin("A", "old"); await newer.begin("A", "new"); await old.complete("A", "old");
    assert.equal(await newer.pending("A"), true);
    await newer.complete("A", "new"); assert.equal(await newer.pending("A"), false);
  } finally { db.close(); }
});
test("invalid picker owner/operation never writes a marker", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    const store = create(db);
    await assert.rejects(store.begin("", "one")); await assert.rejects(store.begin("A", ""));
    assert.equal(await store.pending("A"), false);
  } finally { db.close(); }
});
test("picker markers wrap accepted images without adopting interrupted picker results", () => {
  const source = readFileSync(new URL("../../app/capture/index.tsx", import.meta.url), "utf8");
  const choose = source.slice(source.indexOf("async function choose("), source.indexOf("function confirmServerFallback("));
  assert.ok(choose.indexOf("pickerRecovery.begin") >= 0 && choose.indexOf("pickerRecovery.begin") < choose.indexOf("await picker("));
  assert.ok(choose.indexOf("pickerRecovery.complete") > choose.indexOf("await acceptImage(uri)"));
  assert.doesNotMatch(source, /getPendingResultAsync/);
});
