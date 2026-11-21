import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

type Manifest = { manifest: { "uses-feature"?: { $: Record<string, string> }[] } };
const require = createRequire(import.meta.url);
const plugin = require("../../../plugins/with-play-device-reach.js") as {
  addDebugSymbols(gradle: string): string;
  setPortraitOptional(manifest: Manifest): Manifest;
};

test("Play device-reach plugin is registered for prebuild", () => {
  const config = JSON.parse(readFileSync(new URL("../../../app.json", import.meta.url), "utf8"));
  assert.ok(config.expo.plugins.includes("./plugins/with-play-device-reach"));
});

test("release AAB carries native debug symbols, inserted once", () => {
  const gradle = "android {\n    defaultConfig {\n        applicationId 'x'\n    }\n}";
  const once = plugin.addDebugSymbols(gradle);
  assert.match(once, /defaultConfig \{\n {8}ndk \{ debugSymbolLevel 'SYMBOL_TABLE' \}/);
  assert.equal(plugin.addDebugSymbols(once), once);
  assert.throws(() => plugin.addDebugSymbols("android {}"), /defaultConfig/);
});

test("portrait screen is declared optional so Play does not filter tablets and desktops", () => {
  const added = plugin.setPortraitOptional({ manifest: {} });
  assert.deepEqual(added.manifest["uses-feature"], [{ $: { "android:name": "android.hardware.screen.portrait", "android:required": "false" } }]);
  const existing = plugin.setPortraitOptional({ manifest: { "uses-feature": [{ $: { "android:name": "android.hardware.screen.portrait", "android:required": "true" } }] } });
  assert.equal(existing.manifest["uses-feature"]?.length, 1);
  assert.equal(existing.manifest["uses-feature"]?.[0].$["android:required"], "false");
});
