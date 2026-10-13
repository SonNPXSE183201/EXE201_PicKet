import assert from "node:assert/strict";
import test from "node:test";

import {
  financeRealtimeTables,
  shouldRefreshFromRealtime,
} from "./finance-realtime-policy";

test("subscribes to every server-authoritative finance slice", () => {
  assert.deepEqual(
    financeRealtimeTables.map(({ table }) => table),
    [
      "profiles",
      "user_preferences",
      "wallets",
      "categories",
      "transactions",
      "transaction_splits",
      "budgets",
    ],
  );
});

test("does not overwrite optimistic state while local mutations are pending", () => {
  assert.equal(
    shouldRefreshFromRealtime({ pendingCount: 1, syncing: false }),
    false,
  );
  assert.equal(
    shouldRefreshFromRealtime({ pendingCount: 0, syncing: true }),
    false,
  );
  assert.equal(
    shouldRefreshFromRealtime({ pendingCount: 0, syncing: false }),
    true,
  );
});
