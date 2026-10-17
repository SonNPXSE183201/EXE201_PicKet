import assert from "node:assert/strict";
import test from "node:test";
import { floatingActionBottom } from "./floating-action-layout";

test("keeps FAB above navigation when text wraps at large font scales", () => {
  assert.ok(floatingActionBottom(1, 24) >= 100);
  assert.ok(floatingActionBottom(1.5, 24) >= 140);
  assert.ok(floatingActionBottom(2, 24) >= 180);
  assert.ok(floatingActionBottom(2, 48) > floatingActionBottom(2, 24));
});
