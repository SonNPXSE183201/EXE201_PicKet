import assert from "node:assert/strict";
import { test } from "node:test";

import { refreshFinanceSlices } from "./refresh-finance-slices";

test("refreshes bills and subscriptions with the other finance slices after sync", async () => {
  const called: string[] = [];
  const refresh = (name: string) => async () => { called.push(name); };

  await refreshFinanceSlices({
    profile: refresh("profile"),
    accounts: refresh("accounts"),
    transactions: refresh("transactions"),
    budgets: refresh("budgets"),
    bills: refresh("bills"),
    subscriptions: refresh("subscriptions"),
  });

  assert.deepEqual(called.sort(), ["accounts", "bills", "budgets", "profile", "subscriptions", "transactions"]);
});

test("preference realtime refresh does not refetch transactions or calendar inputs", async () => {
  const called: string[] = [];
  const refresh = (name: string) => async () => { called.push(name); };
  await refreshFinanceSlices({ profile: refresh("profile"), accounts: refresh("accounts"), transactions: refresh("transactions"), budgets: refresh("budgets"), bills: refresh("bills"), subscriptions: refresh("subscriptions") }, ["user_preferences", "profiles"]);
  assert.deepEqual(called, ["profile"]);
});

test("mixed realtime changes retain all affected slices once and unknown events fall back safely", async () => {
  const called: string[] = [];
  const refresh = (name: string) => async () => { called.push(name); };
  const slices = { profile: refresh("profile"), accounts: refresh("accounts"), transactions: refresh("transactions"), budgets: refresh("budgets"), bills: refresh("bills"), subscriptions: refresh("subscriptions") };
  await refreshFinanceSlices(slices, ["user_preferences", "transactions", "transaction_splits"]);
  assert.deepEqual(called.sort(), ["accounts", "budgets", "profile", "transactions"]);
  called.length = 0;
  await refreshFinanceSlices(slices, ["future_table"]);
  assert.equal(called.length, 6);
});
