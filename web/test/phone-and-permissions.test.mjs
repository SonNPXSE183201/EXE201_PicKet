import assert from "node:assert/strict";
import test from "node:test";
import { workspaceRedirect } from "../src/core/auth/workspace-policy.ts";
import { canViewAdminSection } from "../src/features/admin/admin-permissions.ts";
import * as login from "../../packages/domain-ts/src/phone.ts";

test("password sign-in keeps email accounts and phone accounts distinct", () => {
  assert.deepEqual(
    login.passwordLoginCredentials("  Legacy@Example.com ", " unchanged "),
    { email: "legacy@example.com", password: " unchanged " },
  );
  assert.deepEqual(login.passwordLoginCredentials("0901234567", "same"), {
    phone: "+84901234567",
    password: "same",
  });
  assert.throws(() => login.passwordLoginCredentials("not an email", "same"));
});
test("staff can use personal finance without losing admin access", () => {
  assert.equal(workspaceRedirect(true, "/dashboard"), null);
  assert.equal(workspaceRedirect(true, "/session"), "/admin");
});
test("database permissions determine finance menus", () => {
  assert.equal(canViewAdminSection(null, "revenue", ["revenue.read"]), true);
  assert.equal(canViewAdminSection(null, "payments", ["revenue.read"]), false);
});

test("delegated portal users can reach their own MFA without security admin rights", () => {
  for (const permissions of [["permissions.manage"], ["revenue.read"]]) {
    assert.equal(canViewAdminSection(null, "security", permissions), true);
    assert.equal(canViewAdminSection(null, "users", permissions), false);
  }
  assert.equal(canViewAdminSection(null, "security", []), false);
  assert.equal(canViewAdminSection(null, "permissions", ["revenue.read"]), false);
});
