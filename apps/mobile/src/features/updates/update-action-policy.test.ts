import assert from "node:assert/strict";
import test from "node:test";
import { showUpdateCheck } from "./update-action-policy";

test("updater never offers a competing recheck during download, installer or Play handoff", () => {
  for (const phase of ["available", "downloading", "permission", "ready", "opening-installer", "installer-opened", "play-store", "checking"] as const) assert.equal(showUpdateCheck(phase), false, phase);
  for (const phase of ["idle", "current", "error"] as const) assert.equal(showUpdateCheck(phase), true, phase);
});
