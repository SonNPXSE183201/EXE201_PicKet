import assert from "node:assert/strict";
import { test } from "node:test";
import { createLearningProgressStore } from "./progress";
test("concurrent completion retries award once per owner and survive a new store", async () => {
  const records = new Map<string, unknown>();
  const storage = { read: async (owner: string) => records.get(owner), write: async (owner: string, data: unknown) => { records.set(owner,data); } };
  const store = createLearningProgressStore(storage);
  await Promise.all([store.complete("guest", "picket.vi.financial.v1.01", 1), store.complete("guest", "picket.vi.financial.v1.01", 1)]);
  assert.equal((await createLearningProgressStore(storage).load("guest")).completed.length, 1);
  assert.equal((await store.load("userB")).completed.length, 0);
});
test("corrupt progress is never silently replaced", async () => {
  let writes=0;
  const store = createLearningProgressStore({ read: async () => ({ version: 99 }), write: async () => { writes++; } });
  await assert.rejects(store.complete("guest", "picket.vi.financial.v1.01", 1));
  assert.equal(writes,0);
});
