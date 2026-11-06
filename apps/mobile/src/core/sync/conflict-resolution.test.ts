import assert from "node:assert/strict";
import test from "node:test";

import { parseEditedConflictPayload, transactionMergeFields, buildTransactionMerge } from "./conflict-resolution";

const server = { id: "tx", version: 5, title: "Server title", note: "Server note", amount: 500,
  accountId: "wallet", categoryId: null, occurredAt: "2026-10-20T00:00:00Z", deletedAt: null };
const payload = { id: "tx", request: { expectedVersion: 2, title: "Local title", note: "Local note", amount: 100 } };

test("field merge compares only explicit local edits and uses fresh server version", () => {
  const fields = transactionMergeFields(payload, server);
  assert.deepEqual(fields.map(field => field.key), ["title", "amount", "note"]);
  assert.deepEqual(buildTransactionMerge(payload, server, { title: "local", amount: "server", note: "local" }), {
    id: "tx", request: { expectedVersion: 5, title: "Local title", note: "Local note" },
  });
  assert.deepEqual(payload.request, { expectedVersion: 2, title: "Local title", note: "Local note", amount: 100 });
});

test("merge cannot silently overwrite: every field needs a choice, entity must match and be live", () => {
  assert.throws(() => buildTransactionMerge(payload, server, {}), /choice/);
  assert.throws(() => transactionMergeFields(payload, { ...server, id: "other" }), /entity/);
  assert.throws(() => transactionMergeFields(payload, { ...server, deletedAt: "2026-10-20" }), /archived/);
  assert.throws(() => buildTransactionMerge(payload, server, { title: "server", amount: "server", note: "server" }), /local changes/);
});

test("merge validates amount and never retries a foreign or unsupported request field", () => {
  assert.throws(() => transactionMergeFields({ id: "tx", request: { admin: true } }, server), /Unsupported/);
  for (const amount of [-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1, "100"]) {
    assert.throws(() => buildTransactionMerge({ id: "tx", request: { amount } }, server, { amount: "local" }), /amount/);
  }
  assert.throws(() => buildTransactionMerge({ id: "tx", request: { title: "  " } }, server, { title: "local" }), /title/);
});

test("accepts an edited object payload for retry", () => {
  assert.deepEqual(
    parseEditedConflictPayload('{"id":"item","request":{"expectedVersion":4,"title":"Mới"}}'),
    { id: "item", request: { expectedVersion: 4, title: "Mới" } },
  );
});

test("rejects arrays, scalars and invalid JSON", () => {
  for (const value of ["[]", "null", '"text"', "not-json"]) {
    assert.throws(() => parseEditedConflictPayload(value), /JSON object/);
  }
});
