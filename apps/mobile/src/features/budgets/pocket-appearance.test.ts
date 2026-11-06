import assert from "node:assert/strict";
import { test } from "node:test";
import { createPocketAppearanceStore, defaultPocketAppearance, type PocketAppearance } from "./pocket-appearance";
const value: PocketAppearance = { assetId: "shopping", tone: "pocketLilac" };
test("new pocket defaults use the named category art instead of an unrelated ID decoration", () => {
  assert.equal(defaultPocketAppearance("b", "Ăn uống").assetId, "food");
  assert.equal(defaultPocketAppearance("b", "Di chuyển").assetId, "transport");
  assert.equal(defaultPocketAppearance("b").assetId, "leisure", "Legacy unnamed defaults remain stable");
});
test("pocket art survives reloads, remains owner-scoped and never changes the financial budget", async () => {
  const rows = new Map<string, unknown>();
  const storage = { read: async (owner: string) => rows.get(owner) ?? null, write: async (owner: string, raw: unknown) => { rows.set(owner, raw); } };
  const store = createPocketAppearanceStore(storage);
  await store.save("alice", "budget-1", value);
  assert.deepEqual((await createPocketAppearanceStore(storage).load("alice"))["budget-1"], value);
  assert.deepEqual(await store.load("bob"), {});
});
test("concurrent appearance edits preserve both pockets and notify only after durable writes", async () => {
  let saved: unknown = null, notifications = 0;
  const store = createPocketAppearanceStore({ read: async () => saved, write: async (_owner, raw) => { saved = raw; } });
  const stop = store.subscribe("alice", () => notifications++);
  await Promise.all([store.save("alice", "first", value), store.save("alice", "second", { ...value, tone: "pocketMint" })]);
  assert.equal(Object.keys(await store.load("alice")).length, 2);
  assert.equal(notifications, 2);
  stop();
});
test("a failed appearance save can retry without publishing an unsaved choice", async () => {
  let failed = true, saved: unknown = null;
  const store = createPocketAppearanceStore({ read: async () => saved, write: async (_owner, value) => { if (failed) throw new Error("disk"); saved = value; } });
  await assert.rejects(store.save("alice", "first", value), /disk/);
  assert.deepEqual(await store.load("alice"), {});
  failed = false;
  await store.save("alice", "first", value);
  assert.deepEqual((await store.load("alice"))["first"], value);
});
test("corrupt or foreign-owner appearance data never overwrites good preferences", async () => {
  let writes = 0;
  const store = createPocketAppearanceStore({ read: async () => ({ version: 1, owner: "bob", pockets: {} }), write: async () => { writes++; } });
  await assert.rejects(store.save("alice", "first", value));
  assert.equal(writes, 0);
});
