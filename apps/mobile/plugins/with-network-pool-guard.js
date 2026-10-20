const { withAndroidManifest, withDangerousMod, withMainApplication } = require("@expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

function injectNetworkGuard(source) {
  const hook = "PicketNetworkGuard.install(this)";
  const superCall = "super.onCreate()";
  const start = source.indexOf(superCall);
  if (start < 0) throw new Error("Cannot install network guard: Application onCreate was not found");
  if (source.includes(hook)) {
    const reactStart = source.indexOf("loadReactNative(this)");
    if (source.indexOf(hook) < start || (reactStart >= 0 && source.indexOf(hook) > reactStart)) throw new Error("Network guard must initialize before React Native");
    return source;
  }
  return source.replace(superCall, `${superCall}\n    ${hook}`);
}

module.exports = function withNetworkPoolGuard(config) {
  config = withAndroidManifest(config, mod => {
    const permissions = mod.modResults.manifest["uses-permission"] ??= [];
    if (!permissions.some(p => p.$?.["android:name"] === "android.permission.ACCESS_NETWORK_STATE")) permissions.push({ $: { "android:name": "android.permission.ACCESS_NETWORK_STATE" } });
    return mod;
  });
  config = withMainApplication(config, mod => {
    if (mod.modResults.language !== "kt") throw new Error("Picket network guard requires the existing Kotlin Android application");
    mod.modResults.contents = injectNetworkGuard(mod.modResults.contents);
    return mod;
  });
  return withDangerousMod(config, ["android", async mod => {
    const packageName = mod.android?.package;
    if (!packageName || !/^[a-zA-Z_]\w*(\.[a-zA-Z_]\w*)+$/.test(packageName)) throw new Error("Invalid Android package for network guard");
    const target = path.join(mod.modRequest.platformProjectRoot, "app/src/main/java", ...packageName.split("."));
    const template = await fs.readFile(path.join(__dirname, "android/PicketNetworkGuard.kt"), "utf8");
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(path.join(target, "PicketNetworkGuard.kt"), template.replace("__PACKAGE__", packageName));
    return mod;
  }]);
};
module.exports.injectNetworkGuard = injectNetworkGuard;
