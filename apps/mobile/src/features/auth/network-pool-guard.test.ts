import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("network pool guard persists across Expo Android prebuild", () => {
  const plugin = new URL("../../../plugins/with-network-pool-guard.js", import.meta.url);
  assert.equal(existsSync(plugin), true, "Missing persisted Android network guard plugin");
  const config = JSON.parse(readFileSync(new URL("../../../app.json", import.meta.url), "utf8"));
  assert.ok(config.expo.plugins.includes("./plugins/with-network-pool-guard"));
});
