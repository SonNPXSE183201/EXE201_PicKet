import test from "node:test";
import assert from "node:assert/strict";
import {
  assertLiveBackup,
  projectLiveBackup,
} from "../src/core/finance/backup-live-guard.ts";
const data = {
  wallets: [{ id: "w" }],
  entries: [{ id: "live", walletId: "w", destinationId: null }],
  budgets: [],
  bills: [],
  keepsakes: [],
  subscriptions: [],
};
const ids = {
  wallets: new Set(["w"]),
  entries: new Set(["live"]),
  budgets: new Set(),
  bills: new Set(),
  keepsakes: new Set(),
  subscriptions: new Set(),
};
test("safe live export passes without altering financial data", () =>
  assert.doesNotThrow(() => assertLiveBackup(data, ids)));
test("a backend export containing an archived transaction is blocked, never silently revived", () =>
  assert.throws(() =>
    assertLiveBackup(
      {
        ...data,
        entries: [...data.entries, { id: "archived", walletId: "w" }],
      },
      ids,
    ),
  ));
test("export with a missing wallet reference is blocked", () =>
  assert.throws(() => assertLiveBackup({ ...data, wallets: [] }, ids)));
test("export missing a live transaction is blocked instead of silently losing it", () =>
  assert.throws(() =>
    assertLiveBackup(data, { ...ids, entries: new Set(["live", "new"]) }),
  ));
test("web export excludes backend tombstones without changing live rows or the source", () => {
  const archived = { id: "archived", walletId: "w" };
  const source = { ...data, entries: [...data.entries, archived] };
  const result = projectLiveBackup(source, ids);
  assert.deepEqual(result, data);
  assert.equal(source.entries.length, 2);
  assert.equal(result.entries[0], data.entries[0]);
});
test("projection still fails closed when backend omitted live data", () =>
  assert.throws(() =>
    projectLiveBackup(data, { ...ids, entries: new Set(["live", "missing"]) }),
  ));
