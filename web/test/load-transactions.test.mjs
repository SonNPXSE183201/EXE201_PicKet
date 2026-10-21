import test from "node:test";
import assert from "node:assert/strict";
import { loadAllTransactions } from "../src/core/finance/load-transactions.ts";

test("balance loader reads subsequent pages and deduplicates IDs", async () => {
  const calls = [];
  const first = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
  const api = {
    listTransactions: async (token, query) => {
      calls.push({ token, ...query });
      return {
        transactions:
          query.offset === 0 ? first : [{ id: "99" }, { id: "100" }],
      };
    },
  };
  const rows = await loadAllTransactions(api, "qa-token");
  assert.equal(rows.length, 101);
  assert.equal(rows.at(-1).id, "100");
  assert.deepEqual(
    calls.map((c) => c.offset),
    [0, 100],
  );
  assert.ok(calls.every((c) => c.limit === 100 && c.token === "qa-token"));
});
test("balance loader propagates failures instead of returning an incomplete total", async () => {
  const api = {
    listTransactions: async (_token, query) => {
      if (query.offset) throw Error("offline");
      return {
        transactions: Array.from({ length: 100 }, (_, i) => ({
          id: String(i),
        })),
      };
    },
  };
  await assert.rejects(loadAllTransactions(api, "qa-token"), /offline/);
});
