import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhoneNumber, passwordLoginCredentials } from "@picket/domain";
import { mobileAccessAllowed } from "./mobile-access-policy";
test("normalizes Vietnamese phone and rejects email/invalid numbers", () => {
  assert.equal(normalizePhoneNumber("0901 234 567"), "+84901234567");
  assert.equal(normalizePhoneNumber("+84 901234567"), "+84901234567");
  for (const value of ["a@example.test", "123", "+840901234567", "09012345678"])
    assert.throws(() => normalizePhoneNumber(value));
});
test("delegated finance user keeps personal mobile access", () => {
  assert.equal(mobileAccessAllowed({ staff: true, mobileAllowed: true }), true);
});

test("legacy email login preserves password and uses email credentials only", () => {
  assert.deepEqual(
    passwordLoginCredentials("  Tester+QA@Gmail.com  ", " Password! "),
    { email: "tester+qa@gmail.com", password: " Password! " },
  );
});
test("phone login uses normalized phone credentials only", () => {
  assert.deepEqual(passwordLoginCredentials("0901 234 567", "Password!"), {
    phone: "+84901234567",
    password: "Password!",
  });
});
test("invalid identities are rejected without treating them as another account type", () => {
  for (const value of [
    "",
    "someone@",
    "a b@example.com",
    "a@@example.com",
    "123",
    "+840901234567",
    "a@example.com\nother",
  ])
    assert.throws(() => passwordLoginCredentials(value, "Password!"));
});
