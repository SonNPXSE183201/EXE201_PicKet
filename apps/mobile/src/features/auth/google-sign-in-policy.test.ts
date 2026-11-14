import assert from "node:assert/strict";
import test from "node:test";
import { nativeGoogleOutcome, shouldUseNativeGoogle } from "./google-sign-in-policy";

test("native Google requires Android and a configured web client", () => {
  assert.equal(shouldUseNativeGoogle({ platform: "android", clientId: "web-id" }), true);
  for (const platform of ["ios", "web"]) {
    assert.equal(shouldUseNativeGoogle({ platform, clientId: "web-id" }), false);
  }
  for (const clientId of [undefined, "", "  "]) {
    assert.equal(shouldUseNativeGoogle({ platform: "android", clientId }), false);
  }
});

test("native success requires a nonempty ID token", () => {
  assert.equal(nativeGoogleOutcome({ type: "success", data: { idToken: "token" } }), "token");
  for (const idToken of [null, undefined, "", "  "]) {
    assert.equal(nativeGoogleOutcome({ type: "success", data: { idToken } }), "fallback");
  }
});

test("cancellation never falls back to OAuth", () => {
  assert.equal(nativeGoogleOutcome({ type: "cancelled", data: null }), "cancelled");
  for (const code of ["SIGN_IN_CANCELLED", "12501", 12501]) {
    assert.equal(nativeGoogleOutcome({ code }), "cancelled");
  }
});

test("only unavailable module, Play Services and developer errors fall back", () => {
  for (const code of ["NATIVE_MODULE_UNAVAILABLE", "PLAY_SERVICES_NOT_AVAILABLE", "DEVELOPER_ERROR", "10", 10]) {
    assert.equal(nativeGoogleOutcome({ code }), "fallback");
  }
  for (const error of [{ code: "IN_PROGRESS" }, { code: "ASYNC_OP_IN_PROGRESS" }, { code: "NETWORK_ERROR" }, new Error("offline"), null, undefined]) {
    assert.equal(nativeGoogleOutcome(error), "rethrow");
  }
});
