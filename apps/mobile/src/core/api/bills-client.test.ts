import assert from "node:assert/strict";
import test from "node:test";

import { PicketApiClient } from "@picket/api-client";

test("bill create sends authentication, idempotency and normalized JSON", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const client = new PicketApiClient("https://api.example.test/", {
    fetch: async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({ bill: { id: "bill-1" } }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    },
  });

  await client.createBill(
    "access-token",
    { title: "Tiền điện", amount: 450000, dueAt: "2026-10-31T17:00:00.000Z" },
    "bill-key-0001",
  );

  assert.equal(capturedUrl, "https://api.example.test/v1/bills");
  assert.equal(capturedInit?.method, "POST");
  assert.deepEqual(capturedInit?.headers, {
    authorization: "Bearer access-token",
    "content-type": "application/json",
    "idempotency-key": "bill-key-0001",
  });
  assert.equal(capturedInit?.body, JSON.stringify({ title: "Tiền điện", amount: 450000, dueAt: "2026-10-31T17:00:00.000Z" }));
});

test("bill archive carries optimistic version in the query", async () => {
  let capturedUrl = "";
  const client = new PicketApiClient("https://api.example.test", {
    fetch: async (input) => {
      capturedUrl = String(input);
      return new Response(JSON.stringify({ bill: { id: "bill-1" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  await client.archiveBill("access-token", "bill/unsafe", 3);
  assert.equal(capturedUrl, "https://api.example.test/v1/bills/bill%2Funsafe?expectedVersion=3");
});
