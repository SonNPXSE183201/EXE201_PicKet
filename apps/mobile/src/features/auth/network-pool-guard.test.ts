import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

test("network pool guard persists across Expo Android prebuild", () => {
  const plugin = new URL("../../../plugins/with-network-pool-guard.js", import.meta.url);
  assert.equal(existsSync(plugin), true, "Missing persisted Android network guard plugin");
  const config = JSON.parse(readFileSync(new URL("../../../app.json", import.meta.url), "utf8"));
  assert.ok(config.expo.plugins.includes("./plugins/with-network-pool-guard"));
});

test("plugin inserts once before React Native and rejects misplaced or missing bootstrap hooks", () => {
  const require = createRequire(import.meta.url);
  const { injectNetworkGuard } = require("../../../plugins/with-network-pool-guard.js") as { injectNetworkGuard(source: string): string };
  const original = "override fun onCreate() {\n super.onCreate()\n loadReactNative(this)\n}";
  const modified = injectNetworkGuard(original);
  assert.equal(injectNetworkGuard(modified), modified);
  assert.ok(modified.indexOf("PicketNetworkGuard.install(this)") < modified.indexOf("loadReactNative(this)"));
  assert.throws(() => injectNetworkGuard("fun unrelated() {}"), /onCreate/);
  assert.throws(() => injectNetworkGuard(original+"PicketNetworkGuard.install(this)"), /before React Native/);
});

test("native guard retains defaults, actual pools and active-call safety without credential logs", () => {
  const source = readFileSync(new URL("../../../plugins/android/PicketNetworkGuard.kt", import.meta.url), "utf8");
  assert.match(source, /createClientBuilder\(application\)/);
  assert.match(source, /WeakReference\(pool\)/);
  assert.match(source, /registerDefaultNetworkCallback/);
  assert.match(source, /NET_CAPABILITY_VALIDATED/);
  assert.match(source, /connectionReleased/);
  assert.match(source, /pool\.evictAll\(\)/);
  assert.doesNotMatch(source, /cancelAll|executorService|bindProcessToNetwork|hostnameVerifier|sslSocketFactory|Authorization|Log\.[idv]\(/);
});
