import assert from "node:assert/strict";
import test from "node:test";
import { keepsakeCollectionState } from "./keepsake-view-policy";

test("loading or initial failure never advertises an empty collection", () => {
  assert.equal(keepsakeCollectionState(true, false, 0, ""), "loading");
  assert.equal(keepsakeCollectionState(false, true, 0, ""), "error");
  assert.equal(keepsakeCollectionState(false, false, 0, ""), "empty");
});
test("search with no matches differs from empty collection; existing data survives refresh", () => {
  assert.equal(keepsakeCollectionState(false, false, 0, "camera"), "no-results");
  assert.equal(keepsakeCollectionState(true, true, 2, ""), "items");
});
