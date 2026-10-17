import assert from "node:assert/strict";
import test from "node:test";

import {
  financeRealtimeTables,
  shouldRefreshFromRealtime,
  nextFinanceChannelName,
} from "./finance-realtime-policy";

test("remount never reuses a subscribed channel while async removal is pending", () => {
  const channels = new Map<string, { subscribed: boolean }>();
  const subscribe = (user: string) => {
    const name = nextFinanceChannelName(user);
    const channel = channels.get(name) ?? { subscribed: false };
    assert.equal(channel.subscribed, false, "cannot attach postgres callbacks after subscribe");
    channel.subscribed = true;
    channels.set(name, channel);
    return name;
  };
  assert.notEqual(subscribe("A"), subscribe("A"));
  assert.notEqual(subscribe("A"), subscribe("B"));
});

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
