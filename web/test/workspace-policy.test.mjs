import test from "node:test";
import assert from "node:assert/strict";
import { workspaceRedirect } from "../src/core/auth/workspace-policy.ts";

test("staff retains personal workspace and enters admin from session", () => {
  for (const path of [
    "/dashboard",
    "/accounts",
    "/transactions/new",
    "/profile",
    "/onboarding",

  ]) {
    assert.equal(workspaceRedirect(true, path), null);
  }
  assert.equal(workspaceRedirect(true, "/admin"), null);
  assert.equal(workspaceRedirect(true, "/admin/settings"), null);
});

test("ordinary users cannot enter admin routes or admin-prefix lookalikes", () => {
  assert.equal(workspaceRedirect(false, "/admin"), "/dashboard");
  assert.equal(workspaceRedirect(false, "/admin/settings"), "/dashboard");
  assert.equal(workspaceRedirect(false, "/session"), "/dashboard");
  assert.equal(workspaceRedirect(false, "/transactions"), null);
  assert.equal(workspaceRedirect(true, "/administrator"), null);
});

test("password recovery and logout remain reachable to both roles", () => {
  for (const staff of [true, false]) {
    for (const path of [
      "/reset-password",
      "/forgot-password",
      "/login",
      "/auth/callback",
    ]) {
      assert.equal(workspaceRedirect(staff, path), null);
    }
  }
});
