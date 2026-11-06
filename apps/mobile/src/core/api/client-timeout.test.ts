import assert from "node:assert/strict";
import test from "node:test";

import { ApiError, PicketApiClient } from "@picket/api-client";

function abortableNeverFetch(
  _input: URL | RequestInfo,
  init?: RequestInit,
): Promise<Response> {
  return new Promise((_, reject) => {
    init?.signal?.addEventListener(
      "abort",
      () => reject(new DOMException("Aborted", "AbortError")),
      { once: true },
    );
  });
}

test("turns the client timeout into an offline-compatible API error", async () => {
  const client = new PicketApiClient("https://api.example.test", {
    fetch: abortableNeverFetch,
    requestTimeoutMs: 10,
  });

  await assert.rejects(
    client.health(),
    (error: unknown) => error instanceof ApiError && error.status === 0,
  );
});

test("keeps an explicit caller abort distinguishable from offline failures", async () => {
  const client = new PicketApiClient("https://api.example.test", {
    fetch: abortableNeverFetch,
    requestTimeoutMs: 1_000,
  });
  const controller = new AbortController();
  const request = client.health(controller.signal);
  controller.abort();

  await assert.rejects(
    request,
    (error: unknown) => error instanceof Error && error.name === "AbortError",
  );
});
