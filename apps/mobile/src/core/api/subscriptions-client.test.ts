import assert from "node:assert/strict";
import test from "node:test";

import { PicketApiClient } from "@picket/api-client";

test("subscription create sends idempotency and schedule payload", async () => {
  let requestUrl = ""; let requestInit: RequestInit | undefined;
  const client = new PicketApiClient("https://api.example.test/", { fetch: async (input, init) => { requestUrl = String(input); requestInit = init; return new Response(JSON.stringify({ subscription: { id: "sub-1" } }), { status: 201, headers: { "content-type": "application/json" } }); } });
  const request = { title: "Internet", amount: 300000, cadence: "monthly" as const, nextDueAt: "2026-11-15T12:00:00.000Z", cycleMonths: 1, note: "", alertDays: 3 };
  await client.createSubscription("token", request, "subscription-key-1");
  assert.equal(requestUrl, "https://api.example.test/v1/subscriptions");
  assert.equal(requestInit?.method, "POST");
  assert.deepEqual(requestInit?.headers, { authorization: "Bearer token", "content-type": "application/json", "idempotency-key": "subscription-key-1" });
  assert.equal(requestInit?.body, JSON.stringify(request));
});

test("subscription archive URL encodes the id and expected version", async () => {
  let requestUrl = "";
  const client = new PicketApiClient("https://api.example.test", { fetch: async (input) => { requestUrl = String(input); return new Response(JSON.stringify({ subscription: { id: "sub-1" } }), { status: 200, headers: { "content-type": "application/json" } }); } });
  await client.archiveSubscription("token", "sub/unsafe", 4);
  assert.equal(requestUrl, "https://api.example.test/v1/subscriptions/sub%2Funsafe?expectedVersion=4");
});
