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
