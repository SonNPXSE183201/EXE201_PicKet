import assert from "node:assert/strict";
import test from "node:test";
import { signOutCopy } from "./sign-out-copy";

test("sign-out does not claim there are unsynced changes for a clean owner", () => {
  assert.equal(signOutCopy(0, 0), "signOutClean");
  assert.equal(signOutCopy(2, 0), "signOutPending");
  assert.equal(signOutCopy(0, 1), "signOutPending");
});
