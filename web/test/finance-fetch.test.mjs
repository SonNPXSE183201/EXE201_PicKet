import test from "node:test";
import assert from "node:assert/strict";

import { createFinanceFetch, financeCacheTag } from "../src/core/finance/finance-fetch.ts";

function transport(extra = {}) {
  const calls = [];
  let invalidations = 0;
  const fetch = createFinanceFetch("https://api.picket.test", "session-a", () => {
    invalidations++;
  }, {
    fetch: async (url, options) => {
      calls.push({ url: String(url), options });
      return Response.json({ ok: true });
    },
    ...extra,
  });
  const auth = { headers: { authorization: "Bearer session-a" } };
  return { fetch, calls, auth, invalidations: () => invalidations };
}

test("shared finance reads carry a short, session-specific cache policy", async () => {
  const t = transport();
  for (const path of ["me", "accounts", "transactions?limit=100&offset=0", "categories", "budgets", "planning?month=2026-11", "transaction-splits?ids=a,b"]) {
    await t.fetch(`https://api.picket.test/v1/${path}`, t.auth);
  }
  assert.ok(t.calls.every(({ options }) => options.cache === "force-cache"));
  assert.ok(t.calls.every(({ options }) => options.next.revalidate > 0 && options.next.revalidate <= 15));
  assert.ok(t.calls.every(({ options }) => options.next.tags[0] === financeCacheTag("session-a")));
  assert.notEqual(financeCacheTag("session-a"), financeCacheTag("session-b"));
  assert.ok(!financeCacheTag("session-a").includes("session-a"));
  assert.equal(t.invalidations(), 0);
});

test("authorization, entitlements, exports and unknown URLs are always live", async () => {
  const t = transport();
  for (const path of ["account/access", "billing/entitlements", "export", "admin/portal", "transactions/a"]) {
    await t.fetch(`https://api.picket.test/v1/${path}`, t.auth);
  }
  await t.fetch("https://other.test/v1/accounts", t.auth);
  await t.fetch("https://api.picket.test/v1/accounts", { headers: { authorization: "Bearer session-b" } });
  await t.fetch("https://api.picket.test/v1/accounts");
  assert.ok(t.calls.every(({ options }) => options.cache === "no-store" && !options.next));
});

test("server actions and explicitly fresh reads bypass cached versions", async () => {
  const t = transport({ cacheReads: false });
  await t.fetch("https://api.picket.test/v1/accounts", t.auth);
  assert.equal(t.calls[0].options.cache, "no-store");
  const fresh = transport();
  await fresh.fetch("https://api.picket.test/v1/transactions", { ...fresh.auth, cache: "no-store" });
  assert.equal(fresh.calls[0].options.cache, "no-store");
});

test("all write methods invalidate shared reads and preserve request options", async () => {
  const t = transport();
  const controller = new AbortController();
  for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
    await t.fetch("https://api.picket.test/v1/accounts", {
      ...t.auth, method, body: "{}", signal: controller.signal,
    });
  }
  assert.equal(t.invalidations(), 4);
  assert.ok(t.calls.every(({ options }) => options.cache === "no-store"));
  assert.ok(t.calls.every(({ options }) => options.body === "{}" && options.signal === controller.signal));
});

test("an ambiguous write failure also expires possibly outdated balances", async () => {
  const t = transport({ fetch: async () => { throw new Error("response lost"); } });
  await assert.rejects(t.fetch("https://api.picket.test/v1/transactions", { ...t.auth, method: "POST" }), /response lost/);
  assert.equal(t.invalidations(), 1);
});

test("a Request object retains its credentials and method", async () => {
  const t = transport();
  await t.fetch(new Request("https://api.picket.test/v1/accounts", t.auth));
  assert.equal(t.calls[0].options.cache, "force-cache");
  await t.fetch(new Request("https://api.picket.test/v1/accounts", { ...t.auth, method: "DELETE" }));
  assert.equal(t.invalidations(), 1);
});
