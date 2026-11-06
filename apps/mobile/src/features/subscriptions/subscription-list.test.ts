import assert from "node:assert/strict";
import { test } from "node:test";

import { partitionSubscriptions } from "./subscription-list";

const subscriptions = [
  { id: "active", active: true, deletedAt: null },
  { id: "paused", active: false, deletedAt: null },
  { id: "archived", active: false, deletedAt: "2026-10-17T00:00:00Z" },
];

test("keeps paused subscriptions reachable while excluding archived ones", () => {
  const sections = partitionSubscriptions(subscriptions);
  assert.deepEqual(sections.active.map((item) => item.id), ["active"]);
  assert.deepEqual(sections.paused.map((item) => item.id), ["paused"]);
});
