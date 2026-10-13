import assert from "node:assert/strict";
import test from "node:test";

import { parseAuthCallbackUrl } from "./auth-callback";

test("parses a PKCE authorization code", () => {
  const result = parseAuthCallbackUrl("com.picket.mobile://auth/callback?code=pkce-code");

  assert.equal(result.code, "pkce-code");
  assert.equal(result.accessToken, null);
  assert.equal(result.refreshToken, null);
});

test("parses an implicit mobile session from the URL fragment", () => {
  const result = parseAuthCallbackUrl(
    "com.picket.mobile://auth/callback#access_token=access-value&refresh_token=refresh-value",
  );

  assert.equal(result.accessToken, "access-value");
  assert.equal(result.refreshToken, "refresh-value");
  assert.equal(result.code, null);
});

test("parses OAuth errors from either query or fragment parameters", () => {
  const queryResult = parseAuthCallbackUrl(
    "com.picket.mobile://auth/callback?error=access_denied&error_description=Login%20cancelled",
  );
  const fragmentResult = parseAuthCallbackUrl(
    "com.picket.mobile://auth/callback#error_description=Provider%20failed",
  );

  assert.equal(queryResult.errorDescription, "Login cancelled");
  assert.equal(fragmentResult.errorDescription, "Provider failed");
});
