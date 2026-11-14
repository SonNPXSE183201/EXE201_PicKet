import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const plugin = require("../../../plugins/with-release-shrinking.js");

test("release builds enable R8 and resource shrinking without duplicating properties", () => {
  const items = plugin.setProperties([
    { type: "property", key: "android.enableMinifyInReleaseBuilds", value: "false" },
    { type: "property", key: "newArchEnabled", value: "true" },
  ]);
  const value = (key: string) => items.filter((i: { key?: string }) => i.key === key).map((i: { value: string }) => i.value);
  assert.deepEqual(value("android.enableMinifyInReleaseBuilds"), ["true"]);
  assert.deepEqual(value("android.enableShrinkResourcesInReleaseBuilds"), ["true"]);
  assert.deepEqual(value("newArchEnabled"), ["true"]);
});

test("keep rules are merged once and replaced on re-run", () => {
  const once = plugin.mergeRules("# base", "-keep class a.** { *; }");
  const twice = plugin.mergeRules(once, "-keep class b.** { *; }");
  assert.match(twice, /# base/);
  assert.doesNotMatch(twice, /class a\./);
  assert.equal(twice.match(/BEGIN picket-release-shrinking/g)?.length, 1);
});
