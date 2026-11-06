import assert from "node:assert/strict";
import { test } from "node:test";
import { createLearningProgressStore } from "./progress";

test("reviews become due at seven and thirty days and survive restart without more XP", async () => {
  let value: unknown;
  let now = new Date("2026-10-01T12:00:00Z");
  const storage = { read: async () => value, write: async (_: string, next: unknown) => { value = next; } };
  const store = createLearningProgressStore(storage, () => now);
  await store.complete("guest", "picket.vi.financial.v1.01", 1);
  assert.equal((await store.dueReviews("guest", "2026-10-07")).length, 0);
  assert.equal((await store.dueReviews("guest", "2026-10-08")).length, 1);
  now = new Date("2026-10-08T12:00:00Z");
  await Promise.all([store.review("guest", "picket.vi.financial.v1.01", 1, 7), store.review("guest", "picket.vi.financial.v1.01", 1, 7)]);
  const restarted = createLearningProgressStore(storage, () => now);
  assert.equal((await restarted.dueReviews("guest", "2026-10-08")).length, 0);
  assert.equal((await restarted.dueReviews("guest", "2026-10-31"))[0].offset, 30);
  assert.equal((await restarted.load("guest")).completed.reduce((sum, row) => sum + row.xp, 0), 20);
  await assert.rejects(store.review("guest", "picket.vi.financial.v1.01", 1, 30));
});

test("cloud dates are preserved and legacy undated completions do not invent overdue reviews", async () => {
  let value: unknown = { version: 1, completed: [{ owner: "guest", lessonId: "picket.vi.financial.v1.01", version: 1, xp: 20 }] };
  const store = createLearningProgressStore({ read: async () => value, write: async (_, next) => { value = next; } });
  assert.deepEqual(await store.dueReviews("guest", "2026-11-01"), []);
  await store.mergeVerified("guest", [{ lesson_id: "picket.vi.financial.v1.01", content_version: 1, xp: 20, completed_at: "2026-10-01T12:00:00Z" }]);
  assert.equal((await store.dueReviews("guest", "2026-11-01")).length, 2);
});

test("replaying completion keeps the original review anchor and rejects corrupt review history", async () => {
  let value: unknown;
  let now=new Date("2026-12-25T23:00:00Z");
  const storage={read:async()=>value,write:async(_:string,next:unknown)=>{value=next;}};
  const store=createLearningProgressStore(storage,()=>now);
  await store.complete("guest","picket.vi.financial.v1.01",1);
  now=new Date("2027-01-01T23:00:00Z");
  await store.complete("guest","picket.vi.financial.v1.01",1);
  assert.equal((await store.dueReviews("guest","2027-01-01"))[0].dueDay,"2027-01-01");
  await assert.rejects(store.dueReviews("otherOwner","2027-01-01"));
  const before=JSON.stringify(value);
  await assert.rejects(store.review("guest","unknown",1,7));
  assert.equal(JSON.stringify(value),before);
  value={version:1,completed:[{owner:"guest",lessonId:"picket.vi.financial.v1.01",version:1,xp:20,completedAt:"invalid",reviewedOffsets:[7,7]}]};
  await assert.rejects(store.load("guest"));
});
