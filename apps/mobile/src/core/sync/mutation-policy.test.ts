import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "@picket/api-client";

import { decideMutationFailure, mutationFailureReason } from "./mutation-policy";

test("retries connection failures without quarantining offline changes", () => {
  const error = new ApiError("offline", 0);
  assert.equal(decideMutationFailure(error, 20), "retry");
  assert.equal(mutationFailureReason(error), "api_0");
});

test("moves optimistic-version conflicts out of the active queue", () => {
  const error = new ApiError("stale version", 409);
  assert.equal(decideMutationFailure(error, 0), "conflict");
  assert.equal(mutationFailureReason(error), "api_409");
});

test("quarantines invalid requests and missing resources", () => {
  assert.equal(decideMutationFailure(new ApiError("invalid", 422), 0), "conflict");
  assert.equal(decideMutationFailure(new ApiError("missing", 404), 0), "conflict");
});

test("retries temporary server failures before the fifth failed attempt", () => {
  const error = new ApiError("temporary", 503);
  assert.equal(decideMutationFailure(error, 3), "retry");
  assert.equal(decideMutationFailure(error, 4), "conflict");
});

test("retries unknown failures conservatively", () => {
  assert.equal(decideMutationFailure(new Error("unknown"), 10), "retry");
  assert.equal(mutationFailureReason(new Error("unknown")), "unknown_failure");
});
