import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("conflict screen observes queue changes so a conflict discovered after initial mount is not hidden", () => {
  const source = readFileSync(new URL("../../features/sync/conflict-screen.tsx", import.meta.url), "utf8");
  assert.match(source, /subscribeToMutationQueue\(reload\)/);
  assert.match(source, /unsubscribe\(\)/);
});
