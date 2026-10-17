import assert from "node:assert/strict";
import test from "node:test";

import { safeNext } from "../src/core/auth/oauth-redirect.ts";

test("Google callback keeps an ordinary internal destination", () => {
  assert.equal(safeNext("/dashboard"), "/dashboard");
  assert.equal(safeNext("/receipts?tab=recent"), "/receipts?tab=recent");
});

test("Google callback rejects external and ambiguous destinations", () => {
  for (const value of [
    null,
    "https://example.org",
    "//example.org",
    "/\\example.org",
    "/%5cexample.org",
    "/dashboard\r\nLocation: https://example.org",
  ]) {
    assert.equal(safeNext(value), "/dashboard", String(value));
  }
});
