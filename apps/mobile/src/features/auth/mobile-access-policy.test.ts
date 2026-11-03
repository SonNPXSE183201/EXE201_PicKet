import assert from "node:assert/strict";
import test from "node:test";
import {
  mobileAccessAllowed,
  cachedMobileAccessAllowed,
} from "./mobile-access-policy";

test("only an explicit server allowance permits mobile", () => {
  assert.equal(
    mobileAccessAllowed({ staff: false, mobileAllowed: true }),
    true,
  );
  for (const value of [
    null,
    {},
    { staff: true, mobileAllowed: false },
    { staff: false },
    { mobileAllowed: true },
  ]) {
    assert.equal(mobileAccessAllowed(value), false);
  }
});
test("offline allowance is bounded and owner-specific", () => {
  const cache = { owner: "a", allowed: true, checkedAt: 1000 };
  assert.equal(cachedMobileAccessAllowed(cache, "a", 2000), true);
  for (const [item, owner, time] of [
    [cache, "b", 2000],
    [{ ...cache, allowed: false }, "a", 2000],
    [cache, "a", 25 * 60 * 60 * 1000],
    [cache, "a", 500],
  ] as const) {
    assert.equal(cachedMobileAccessAllowed(item, owner, time), false);
  }
});
