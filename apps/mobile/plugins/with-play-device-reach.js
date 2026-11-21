const { withAppBuildGradle, withAndroidManifest } = require("@expo/config-plugins");

/* Google Play release hygiene that must survive `expo prebuild`:
   - Ship native debug symbols (symbol table) inside the AAB, so Play can symbolicate native
     crashes/ANRs and stops warning that the bundle has no debug symbols. The symbols live in
     BUNDLE-METADATA and are not installed on devices.
   - The app is portrait-only; without an explicit declaration Play infers a *required*
     android.hardware.screen.portrait feature and filters out some tablets, desktops and XR
     devices. Declaring it optional keeps the app installable there (it still runs in portrait). */
const NDK_LINE = "ndk { debugSymbolLevel 'SYMBOL_TABLE' }";
const PORTRAIT = "android.hardware.screen.portrait";

function addDebugSymbols(gradle) {
  if (gradle.includes(NDK_LINE)) return gradle;
  const anchor = /defaultConfig\s*\{\n/;
  if (!anchor.test(gradle)) throw new Error("with-play-device-reach: defaultConfig block not found in app/build.gradle");
  return gradle.replace(anchor, (match) => `${match}        ${NDK_LINE}\n`);
}

function setPortraitOptional(manifest) {
  const root = manifest.manifest;
  const features = (root["uses-feature"] ??= []);
  const existing = features.find((feature) => feature.$?.["android:name"] === PORTRAIT);
  if (existing) existing.$["android:required"] = "false";
  else features.push({ $: { "android:name": PORTRAIT, "android:required": "false" } });
  return manifest;
}

module.exports = function withPlayDeviceReach(config) {
  config = withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = addDebugSymbols(mod.modResults.contents);
    return mod;
  });
  return withAndroidManifest(config, (mod) => {
    mod.modResults = setPortraitOptional(mod.modResults);
    return mod;
  });
};
module.exports.addDebugSymbols = addDebugSymbols;
module.exports.setPortraitOptional = setPortraitOptional;
