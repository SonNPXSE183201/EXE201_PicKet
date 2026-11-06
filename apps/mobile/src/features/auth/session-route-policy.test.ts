import assert from "node:assert/strict";
import test from "node:test";
import { canMountSessionRoutes } from "./session-route-policy";

test("cold deep links cannot mount redirecting screens before session/local-mode recovery", () => {
  assert.equal(canMountSessionRoutes(true), false);
  assert.equal(canMountSessionRoutes(false), true);
});
