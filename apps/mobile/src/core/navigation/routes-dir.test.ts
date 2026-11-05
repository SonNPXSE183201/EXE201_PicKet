import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Expo Router bundles every file under src/app as a route; a test file there
// breaks the release JS bundle (node:* imports), so tests live elsewhere.
test("no test files inside the Expo Router app directory", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
  assert.deepEqual(walk("src/app").filter((file) => /\.test\.[cm]?[jt]sx?$/.test(file)), []);
});
