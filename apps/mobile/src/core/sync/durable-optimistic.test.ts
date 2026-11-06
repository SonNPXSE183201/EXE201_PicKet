import assert from "node:assert/strict";
import test from "node:test";

import { persistOptimisticCollection } from "./durable-optimistic";

test("persists an optimistic snapshot before exposing it to the UI", async () => {
  const events: string[] = [];
  const result = await persistOptimisticCollection({
    current: [{ id: "old" }],
    optimistic: { id: "new" },
    persist: async (items) => { events.push(`persist:${items.map((item) => item.id).join(",")}`); },
    publish: () => { events.push("publish"); },
  });

  assert.deepEqual(result.map((item) => item.id), ["new", "old"]);
  assert.deepEqual(events, ["persist:new,old", "publish"]);
});

test("does not publish an optimistic success when durable storage fails", async () => {
  let published = false;
  await assert.rejects(
    persistOptimisticCollection({
      current: [],
      optimistic: { id: "new" },
      persist: async () => { throw new Error("disk full"); },
      publish: () => { published = true; },
    }),
    /disk full/,
  );
  assert.equal(published, false);
});
