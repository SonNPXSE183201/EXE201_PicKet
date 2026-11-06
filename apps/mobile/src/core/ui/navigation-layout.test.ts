import assert from "node:assert/strict";
import { test } from "node:test";
import { dockVisibleOn, screenBottomPadding } from "./navigation-layout";

test("dock clearance grows with safe area and text scale, while forms keep room for the keyboard", () => {
  for (const route of ["/", "/transactions", "/accounts", "/budgets", "/planning", "/profile"]) {
    assert.ok(dockVisibleOn(route));
    assert.ok(screenBottomPadding(route, 24, 2) > screenBottomPadding(route, 24, 1));
    assert.equal(screenBottomPadding(route, 24, 1) - screenBottomPadding(route, 0, 1), 24);
  }
  for (const route of ["/capture", "/transactions/new", "/accounts/new", "/(auth)/login"]) {
    assert.equal(dockVisibleOn(route), false);
    assert.equal(screenBottomPadding(route, 24, 2), 48);
  }
});
