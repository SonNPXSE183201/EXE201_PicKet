import assert from "node:assert/strict";
import test from "node:test";

import {
  createOptimisticAccount,
  createOptimisticTransaction,
  resolveMutationDependencies,
  restorePendingTransactions,
  restorePendingAccounts,
} from "./mutation-dependencies";

test("creates a selectable optimistic account while offline", () => {
  const account = createOptimisticAccount(
    {
      name: "Ví offline",
      kind: "cash",
      currencyCode: "VND",
      openingBalance: 125_000,
    },
    "local-account-1",
    "2026-10-17T10:00:00.000Z",
  );

  assert.equal(account.id, "local-account-1");
  assert.equal(account.name, "Ví offline");
  assert.equal(account.version, 1);
  assert.equal(account.archived, false);
});

test("restores an optimistic account from the durable mutation queue", () => {
  const restored = restorePendingAccounts([], [{
    id: "mutation-account", userId: "user-1", kind: "account.create",
    entityKey: "account:local-account-1", idempotencyKey: "key-1", attempts: 0,
    createdAt: "2026-10-17T10:00:00.000Z",
    payload: { clientEntityId: "local-account-1", request: {
      name: "Ví offline", kind: "cash", currencyCode: "VND", openingBalance: 0,
    } },
  }]);
  assert.equal(restored[0]?.id, "local-account-1");
  assert.equal(restored[0]?.name, "Ví offline");
});

test("restores an optimistic transaction from the durable mutation queue", () => {
  const restored = restorePendingTransactions([], [{
    id: "mutation-1",
    userId: "user-1",
    kind: "transaction.create",
    entityKey: "transaction:local-transaction-1",
    idempotencyKey: "key-1",
    attempts: 0,
    createdAt: "2026-10-17T11:01:00.000Z",
    payload: {
      clientEntityId: "local-transaction-1",
      request: {
        accountId: "local-account-1", amount: 25_000, kind: "expense",
        occurredAt: "2026-10-17T11:00:00.000Z", title: "Bữa trưa",
      },
    },
  }]);

  assert.equal(restored.length, 1);
  assert.equal(restored[0]?.id, "local-transaction-1");
  assert.equal(restored[0]?.title, "Bữa trưa");
});

test("creates an optimistic transaction against the temporary account", () => {
  const transaction = createOptimisticTransaction(
    {
      accountId: "local-account-1",
      amount: 25_000,
      categoryId: null,
      kind: "expense",
      note: "queued",
      occurredAt: "2026-10-17T11:00:00.000Z",
      title: "Bữa trưa",
    },
    "local-transaction-1",
    "2026-10-17T11:01:00.000Z",
  );

  assert.equal(transaction.id, "local-transaction-1");
  assert.equal(transaction.accountId, "local-account-1");
  assert.equal(transaction.amount, 25_000);
});

test("replays a dependent transaction with the server account id", () => {
  const payload = resolveMutationDependencies(
    "transaction.create",
    {
      clientEntityId: "local-transaction-1",
      request: {
        accountId: "local-account-1",
        amount: 25_000,
        categoryId: null,
        kind: "expense",
        occurredAt: "2026-10-17T11:00:00.000Z",
        title: "Bữa trưa",
      },
    },
    new Map([["local-account-1", "server-account-9"]]),
  );

  assert.deepEqual(payload, {
    clientEntityId: "local-transaction-1",
    request: {
      accountId: "server-account-9",
      amount: 25_000,
      categoryId: null,
      kind: "expense",
      occurredAt: "2026-10-17T11:00:00.000Z",
      title: "Bữa trưa",
    },
  });
});

test("does not rewrite unrelated ids or mutate the queued payload", () => {
  const payload = {
    request: {
      accountId: "server-account-existing",
      categoryId: "category-1",
      title: "Không đổi",
    },
  };

  const resolved = resolveMutationDependencies(
    "transaction.create",
    payload,
    new Map([["local-account-1", "server-account-9"]]),
  );

  assert.deepEqual(resolved, payload);
  assert.notEqual(resolved, payload);
});
